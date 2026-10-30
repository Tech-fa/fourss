import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { documentHttpError } from "./document.errors";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LocalFileService } from "../common/local-file.service";
import { ContentType, Document } from "./document.entity";
import { DocumentVersion } from "./document-version.entity";
import {
  detectSourceKind,
  extractChecklistText,
  extractFileText,
  FileTextExtractors,
} from "./document-ai-extract";
import {
  defaultFileTextExtractors,
  hashContent,
} from "./document-ai-file-extractors";
import {
  DocumentAiIndexStatus,
  DocumentAiSource,
  DocumentAiSourceKind,
} from "./document-ai-source.entity";
import { DocumentStatus } from "./dtos";

export type DocumentAiIndexJob = {
  documentId: string;
  versionId: number;
};

export type DocumentAiReadableText = {
  contentType: ContentType | null;
  sourceKind: DocumentAiSourceKind;
  status: DocumentAiIndexStatus;
  fullText: string | null;
  error: string | null;
  versionId: number | null;
};

@Injectable()
export class DocumentAiIndexService {
  private readonly logger = new Logger(DocumentAiIndexService.name);
  private extractors: FileTextExtractors = defaultFileTextExtractors;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepository: Repository<DocumentVersion>,
    @InjectRepository(DocumentAiSource)
    private readonly sourceRepository: Repository<DocumentAiSource>,
    private readonly s3Service: LocalFileService,
  ) {}

  useExtractors(extractors: FileTextExtractors): void {
    this.extractors = extractors;
  }

  async indexDocumentVersion(job: DocumentAiIndexJob): Promise<void> {
    const { documentId, versionId } = job;
    if (!documentId || !versionId) {
      this.logger.warn("Skipping document AI index: missing job fields");
      return;
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, deleted: false },
      relations: ["team"],
    });
    if (!document) {
      this.logger.warn(
        `Skipping document AI index: document ${documentId} not found`,
      );
      return;
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, documentId },
      relations: ["checklist", "checklist.questions"],
    });
    if (
      version?.versionNumber != document.currentVersion ||
      version?.status != DocumentStatus.PUBLISHED
    ) {
      this.logger.warn(
        `Skipping document AI index: version ${versionId} is not the current version`,
      );
      return;
    }
    if (!version) {
      this.logger.warn(
        `Skipping document AI index: version ${versionId} not found`,
      );
      return;
    }

    if (!document.isAiAccessible) {
      await this.upsertSource(document, version, {
        sourceKind: DocumentAiSourceKind.UNSUPPORTED,
        status: DocumentAiIndexStatus.SKIPPED,
        fullText: null,
        contentHash: null,
        error: "Document is not AI accessible",
      });
      return;
    }

    try {
      const extracted = await this.extractFromVersion(document, version);
      await this.upsertSource(document, version, extracted);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document AI index failed";
      this.logger.error(
        `Failed to index document ${documentId} version ${versionId}`,
        error instanceof Error ? error.stack : error,
      );
      await this.upsertSource(document, version, {
        sourceKind: this.fallbackKind(document),
        status: DocumentAiIndexStatus.FAILED,
        fullText: null,
        contentHash: null,
        error: message,
      });
    }
  }

  async requireStoredText(document: {
    id: string;
    isAiAccessible: boolean;
    currentVersion: number;
  }): Promise<{ versionId: number; text: string }> {
    const stored = await this.readStoredText(document);
    if (!stored) {
      throw new NotFoundException(documentHttpError("DOC_124"));
    }
    return stored;
  }

  async readStoredText(document: {
    id: string;
    isAiAccessible: boolean;
    currentVersion: number;
  }): Promise<{ versionId: number; text: string } | null> {
    if (!document.isAiAccessible) return null;
    const version = await this.versionRepository.findOne({
      where: {
        documentId: document.id,
        versionNumber: document.currentVersion,
      },
    });
    if (!version) return null;
    const source = await this.sourceRepository.findOne({
      where: {
        documentVersionId: version.id,
        status: DocumentAiIndexStatus.READY,
      },
    });
    const text = source?.fullText;
    if (!text?.trim()) return null;
    return { versionId: version.id, text };
  }

  async readCurrentVersionText(input: {
    documentId: string;
  }): Promise<DocumentAiReadableText> {
    const documentId = input.documentId?.trim();
    if (!documentId) {
      return {
        contentType: null,
        sourceKind: DocumentAiSourceKind.UNSUPPORTED,
        status: DocumentAiIndexStatus.FAILED,
        fullText: null,
        error: "missing_document",
        versionId: null,
      };
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, deleted: false },
    });
    if (!document) {
      return {
        contentType: null,
        sourceKind: DocumentAiSourceKind.UNSUPPORTED,
        status: DocumentAiIndexStatus.FAILED,
        fullText: null,
        error: "document_not_found",
        versionId: null,
      };
    }

    const version =
      (await this.versionRepository.findOne({
        where: {
          documentId,
          versionNumber: document.currentVersion,
        },
        relations: ["checklist", "checklist.questions"],
      })) ||
      (await this.versionRepository.findOne({
        where: { documentId },
        order: { versionNumber: "DESC" },
        relations: ["checklist", "checklist.questions"],
      }));
    if (!version) {
      return {
        contentType: document.contentType,
        sourceKind: this.fallbackKind(document),
        status: DocumentAiIndexStatus.FAILED,
        fullText: null,
        error: "version_not_found",
        versionId: null,
      };
    }

    if (!document.isAiAccessible) {
      return {
        contentType: document.contentType,
        sourceKind: this.fallbackKind(document),
        status: DocumentAiIndexStatus.SKIPPED,
        fullText: null,
        error: "Document is not AI accessible",
        versionId: version.id,
      };
    }

    const existing = await this.sourceRepository.findOne({
      where: {
        documentVersionId: version.id,
      },
    });
    if (existing?.status === DocumentAiIndexStatus.READY && existing.fullText) {
      return {
        contentType: document.contentType,
        sourceKind: existing.sourceKind,
        status: DocumentAiIndexStatus.READY,
        fullText: existing.fullText,
        error: null,
        versionId: version.id,
      };
    }

    try {
      const extracted = await this.extractFromVersion(document, version);
      return {
        contentType: document.contentType,
        sourceKind: extracted.sourceKind,
        status: extracted.status,
        fullText: extracted.fullText,
        error: extracted.error,
        versionId: version.id,
      };
    } catch (error) {
      return {
        contentType: document.contentType,
        sourceKind: this.fallbackKind(document),
        status: DocumentAiIndexStatus.FAILED,
        fullText: null,
        error:
          error instanceof Error ? error.message : "Document AI read failed",
        versionId: version.id,
      };
    }
  }

  private async extractFromVersion(
    document: Document,
    version: DocumentVersion,
  ): Promise<{
    sourceKind: DocumentAiSourceKind;
    status: DocumentAiIndexStatus;
    fullText: string | null;
    contentHash: string | null;
    error: string | null;
  }> {
    if (document.contentType === ContentType.CHECKLIST) {
      const text = extractChecklistText({
        title: document.title,
        documentCode: document.documentCode,
        questions: (version.checklist?.questions || []).map((question) => ({
          questionText: question.questionText,
          questionType: question.questionType,
          required: question.required,
          orderIndex: question.orderIndex,
        })),
      });
      return {
        sourceKind: DocumentAiSourceKind.CHECKLIST,
        status: DocumentAiIndexStatus.READY,
        fullText: text,
        contentHash: hashContent(text),
        error: null,
      };
    }

    const storageKey =
      document.contentType === ContentType.EDITOR
        ? version.content
        : version.file;
    if (!storageKey) {
      throw new Error("Document version has no file to index");
    }

    const fileName = await this.s3Service.getStoredFileName(storageKey);
    const kind = detectSourceKind(fileName);
    if (kind === "unsupported") {
      return {
        sourceKind: DocumentAiSourceKind.UNSUPPORTED,
        status: DocumentAiIndexStatus.SKIPPED,
        fullText: null,
        contentHash: null,
        error: `Unsupported file type: ${fileName}`,
      };
    }

    const buffer = await this.s3Service.getFileBuffer(storageKey);
    if (!buffer?.length) {
      throw new Error("Failed to download document file for indexing");
    }

    const contentHash = hashContent(buffer);
    const existing = await this.sourceRepository.findOne({
      where: {
        documentVersionId: version.id,
      },
    });
    if (
      existing?.contentHash === contentHash &&
      existing.status === DocumentAiIndexStatus.READY &&
      existing.fullText
    ) {
      return {
        sourceKind: this.toSourceKind(kind),
        status: DocumentAiIndexStatus.READY,
        fullText: existing.fullText,
        contentHash,
        error: null,
      };
    }

    const fullText = await extractFileText(kind, buffer, this.extractors);
    return {
      sourceKind: this.toSourceKind(kind),
      status: DocumentAiIndexStatus.READY,
      fullText,
      contentHash,
      error: null,
    };
  }

  private async upsertSource(
    document: Document,
    version: DocumentVersion,
    extracted: {
      sourceKind: DocumentAiSourceKind;
      status: DocumentAiIndexStatus;
      fullText: string | null;
      contentHash: string | null;
      error: string | null;
    },
  ): Promise<void> {
    const now = Date.now();
    const existing = await this.sourceRepository.findOne({
      where: {
        documentVersionId: version.id,
      },
    });
    const row = existing ?? this.sourceRepository.create();
    row.documentId = document.id;
    row.documentVersionId = version.id;
    row.teamId = document.team.id;
    row.isPublic = !!document.isPublic;
    row.contentType = document.contentType;
    row.sourceKind = extracted.sourceKind;
    row.status = extracted.status;
    row.fullText = extracted.fullText;
    row.contentHash = extracted.contentHash;
    row.error = extracted.error;
    row.extractedAt = now;
    row.updatedAt = now;
    if (!existing) {
      row.createdAt = now;
    }
    await this.sourceRepository.save(row);
  }

  private fallbackKind(document: Document): DocumentAiSourceKind {
    if (document.contentType === ContentType.CHECKLIST) {
      return DocumentAiSourceKind.CHECKLIST;
    }
    if (document.contentType === ContentType.EDITOR) {
      return DocumentAiSourceKind.DOCX;
    }
    return DocumentAiSourceKind.UNSUPPORTED;
  }

  private toSourceKind(
    kind: "checklist" | "docx" | "pdf" | "image" | "unsupported",
  ): DocumentAiSourceKind {
    if (kind === "checklist") {
      return DocumentAiSourceKind.CHECKLIST;
    }
    if (kind === "docx") {
      return DocumentAiSourceKind.DOCX;
    }
    if (kind === "pdf") {
      return DocumentAiSourceKind.PDF;
    }
    if (kind === "image") {
      return DocumentAiSourceKind.IMAGE;
    }
    return DocumentAiSourceKind.UNSUPPORTED;
  }
}
