import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as crypto from "crypto";
import { In, Repository } from "typeorm";
import { EmailService } from "../common/email.service";
import { LocalFileService } from "../common/local-file.service";
import { DocumentContributor } from "../document/document-contributor.entity";
import { DocumentActionType } from "../document/document-action.entity";
import { ContentType, DocumentStatus } from "../document/document.enums";
import { Document } from "../document/document.entity";
import { DocumentVersion } from "../document/document-version.entity";
import { redactMaskedDocx } from "../document/redact-masked-docx";
import { StandardImplementationShare } from "./standard-implementation-share.entity";
import { StandardsService } from "./standards.service";
import { standardHttpError } from "./standards.errors";
import {
  hashShareEmail,
  normalizeShareEmail,
  openShareCode,
  sealShareCode,
  ShareCodePayload,
  ShareCodeScope,
} from "./share-code";
import {
  chunkSecrets,
  classifySharedContent,
  encryptBuffer,
  EncryptedPart,
  MAX_SHARED_PREVIEW_BYTES,
  SHARE_CHUNK_BYTES,
  SharedPreviewKind,
  xorBuffers,
} from "./share-content";

const SHARE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_SESSIONS = 100;

type ContentSession = {
  id: string;
  expiresAt: number;
  bytes: Buffer;
  chunkSize: number;
  maskSecret: Buffer;
  ready: Map<number, { material: boolean; cover: boolean }>;
};

export type SharedListDocument = {
  clause: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  linkedTitle: string | null;
  linkedCode: string | null;
  versionNumber: number | null;
  publishedAt: number | null;
  viewCode: string;
};

export type SharedDocumentPreview = {
  title: string;
  documentCode: string;
  versionNumber: number | null;
  publishedAt: number | null;
  contentKind: SharedPreviewKind;
  mime: string | null;
  byteLength: number;
  chunkCount: number;
  sessionId: string | null;
};

@Injectable()
export class StandardShareService {
  private readonly logger = new Logger(StandardShareService.name);
  private readonly sessions = new Map<string, ContentSession>();
  chunkSize = SHARE_CHUNK_BYTES;

  constructor(
    @InjectRepository(StandardImplementationShare)
    private readonly shareRepository: Repository<StandardImplementationShare>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepository: Repository<DocumentVersion>,
    @InjectRepository(DocumentContributor)
    private readonly contributorRepository: Repository<DocumentContributor>,
    private readonly standardsService: StandardsService,
    private readonly emailService: EmailService,
    private readonly fileService: LocalFileService,
    private readonly configService: ConfigService,
  ) {}

  async createShare(
    implementationId: number,
    email: string,
    userId: string,
  ): Promise<{ sent: true; expiresAt: number; previewLink?: string }> {
    const implementation =
      await this.standardsService.getImplementation(implementationId);
    const secret = this.codeSecret();
    const frontend = this.frontendBase();
    const recipientEmail = normalizeShareEmail(email);
    const now = Date.now();
    const expiresAt = now + SHARE_TTL_MS;
    const saved = await this.shareRepository.save(
      this.shareRepository.create({
        implementationId,
        recipientEmail,
        recipientEmailHash: hashShareEmail(recipientEmail),
        createdById: userId,
        createdAt: now,
        expiresAt,
        revokedAt: null,
      }),
    );
    const code = sealShareCode(
      {
        v: 1,
        sid: saved.id,
        email: recipientEmail,
        impl: implementationId,
        scope: "list",
        exp: expiresAt,
      },
      secret,
    );
    const link = `${frontend}/share/standards/${code}`;
    const sent = await this.emailService.sendHtml(
      recipientEmail,
      `Read-only ${implementation.standardName.replace(/[\r\n]/g, " ").slice(0, 120)} documents`,
      this.shareEmailHtml(implementation.standardName, link, expiresAt),
      { to: recipientEmail, link },
    );
    if (!sent) {
      await this.shareRepository.delete({ id: saved.id });
      throw new BadRequestException(standardHttpError("STANDARD_034"));
    }
    if (process.env.NODE_ENV === "production") {
      return { sent: true, expiresAt };
    }
    return { sent: true, expiresAt, previewLink: link };
  }

  async openList(code: string) {
    const share = await this.assertShare(code, "list");
    const implementation = await this.standardsService.getImplementation(
      share.implementationId,
    );
    const linkedIds = implementation.documents.flatMap((document) =>
      this.linkedSummaries(document).map((linked) => linked.id),
    );
    const activeIds = await this.activeDocumentIds(linkedIds);
    const published = await this.publishedByDocument([...activeIds]);
    return {
      standardName: implementation.standardName,
      status: implementation.status,
      completedCount: implementation.completedCount,
      totalCount: implementation.totalCount,
      expiresAt: Number(share.expiresAt),
      documents: implementation.documents.map((document) => {
        const links = this.linkedSummaries(document).filter((linked) =>
          activeIds.has(linked.id),
        );
        const version = links.length ? published.get(links[0].id) : undefined;
        return {
          clause: document.clause,
          title: document.title,
          description: document.description,
          kind: document.kind,
          status: document.status,
          linkedTitle: links.length
            ? links.map((linked) => linked.title).join(", ")
            : null,
          linkedCode: links.length
            ? links.map((linked) => linked.documentCode).join(", ")
            : null,
          versionNumber: version?.versionNumber ?? null,
          publishedAt: version?.publishedAt ?? null,
          viewCode: sealShareCode(
            {
              v: 1,
              sid: share.id,
              email: share.recipientEmail,
              impl: share.implementationId,
              scope: "document",
              doc: document.id,
              exp: Number(share.expiresAt),
            },
            this.codeSecret(),
          ),
        } satisfies SharedListDocument;
      }),
    };
  }

  async openDocument(code: string) {
    const share = await this.assertShare(code, "document");
    const payload = this.readPayload(code, "document");
    const implementation = await this.standardsService.getImplementation(
      share.implementationId,
    );
    const document = implementation.documents.find(
      (item) => item.id === payload.doc,
    );
    if (!document) this.invalidShare();
    const preview = await this.previewLinkedDocument(
      this.linkedSummaries(document)[0]?.id,
    );
    return {
      standardName: implementation.standardName,
      clause: document.clause,
      title: document.title,
      description: document.description,
      kind: document.kind,
      status: document.status,
      expiresAt: Number(share.expiresAt),
      linked: preview,
    };
  }

  async readPart(
    sessionId: string,
    indexValue: string,
    part: "material" | "cover",
  ): Promise<EncryptedPart & { index: number }> {
    const session = this.takeSession(sessionId);
    const index = this.parseIndex(indexValue, session);
    const chunk = this.chunkAt(session, index);
    const secrets = chunkSecrets(session.maskSecret, index, chunk.length);
    const plain =
      part === "material" ? xorBuffers(chunk, secrets.mask) : secrets.mask;
    const key = part === "material" ? secrets.materialKey : secrets.coverKey;
    const flags = session.ready.get(index) ?? { material: false, cover: false };
    flags[part] = true;
    session.ready.set(index, flags);
    return { index, ...encryptBuffer(plain, key) };
  }

  async readKeys(
    sessionId: string,
    indexValue: string,
  ): Promise<{ index: number; materialKey: string; coverKey: string }> {
    const session = this.takeSession(sessionId);
    const index = this.parseIndex(indexValue, session);
    const flags = session.ready.get(index);
    if (!flags?.material || !flags?.cover) {
      throw new BadRequestException(standardHttpError("STANDARD_033"));
    }
    const chunk = this.chunkAt(session, index);
    const secrets = chunkSecrets(session.maskSecret, index, chunk.length);
    return {
      index,
      materialKey: secrets.materialKey.toString("base64url"),
      coverKey: secrets.coverKey.toString("base64url"),
    };
  }

  private linkedSummaries(document: {
    linkedDocument?: { id: string; title: string; documentCode: string } | null;
    linkedDocuments?: { id: string; title: string; documentCode: string }[];
  }) {
    if (document.linkedDocuments?.length) return document.linkedDocuments;
    return document.linkedDocument ? [document.linkedDocument] : [];
  }

  private async previewLinkedDocument(
    documentId?: string,
  ): Promise<SharedDocumentPreview | null> {
    if (!documentId) return null;
    const document = await this.documentRepository.findOne({
      where: { id: documentId, deleted: false },
    });
    if (!document) return null;
    const published = await this.publishedByDocument([document.id]);
    const version = published.get(document.id);
    const base = {
      title: document.title,
      documentCode: document.documentCode,
      versionNumber: version?.versionNumber ?? null,
      publishedAt: version?.publishedAt ?? null,
    };
    if (!version) {
      return { ...base, ...this.emptyPreview("none") };
    }
    const contentType = document.contentType ?? ContentType.FILE;
    if (contentType === ContentType.CHECKLIST) {
      return this.checklistPreview(version.version.id, base);
    }
    const storageKey =
      contentType === ContentType.EDITOR
        ? version.version.content || version.version.file
        : version.version.file || version.version.content;
    if (!storageKey?.trim()) {
      return { ...base, ...this.emptyPreview("none") };
    }
    const bytes = await this.fileService.getFileBuffer(storageKey);
    if (!bytes?.length) return { ...base, ...this.emptyPreview("none") };
    if (bytes.length > MAX_SHARED_PREVIEW_BYTES) {
      return { ...base, ...this.emptyPreview("too_large") };
    }
    const fileName = await this.fileService.getStoredFileName(storageKey);
    const classified = classifySharedContent(fileName, bytes);
    if (classified.kind === "unsupported") {
      return { ...base, ...this.emptyPreview("unsupported") };
    }
    let previewBytes = bytes;
    if (classified.kind === "docx") {
      try {
        previewBytes = await redactMaskedDocx(bytes);
      } catch (error) {
        this.logger.warn(
          `Failed to redact shared document ${documentId}: ${error?.message}`,
        );
        return { ...base, ...this.emptyPreview("unsupported") };
      }
    }
    return {
      ...base,
      contentKind: classified.kind,
      mime: classified.mime,
      byteLength: previewBytes.length,
      chunkCount: Math.ceil(previewBytes.length / this.chunkSize),
      sessionId: this.createSession(previewBytes),
    };
  }

  private async checklistPreview(
    versionId: number,
    base: {
      title: string;
      documentCode: string;
      versionNumber: number | null;
      publishedAt: number | null;
    },
  ): Promise<SharedDocumentPreview> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId },
      relations: ["checklist", "checklist.questions"],
    });
    const questions = [...(version?.checklist?.questions ?? [])]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((question) => ({
        text: question.questionText,
        type: question.questionType,
        required: Boolean(question.required),
      }));
    const bytes = Buffer.from(JSON.stringify({ questions }), "utf8");
    return {
      ...base,
      contentKind: "checklist",
      mime: "application/json",
      byteLength: bytes.length,
      chunkCount: Math.ceil(bytes.length / this.chunkSize),
      sessionId: this.createSession(bytes),
    };
  }

  private emptyPreview(kind: "none" | "unsupported" | "too_large") {
    return {
      contentKind: kind,
      mime: null,
      byteLength: 0,
      chunkCount: 0,
      sessionId: null,
    };
  }

  private async publishedByDocument(documentIds: string[]) {
    const unique = [...new Set(documentIds)];
    const result = new Map<
      string,
      {
        versionNumber: number;
        publishedAt: number;
        version: DocumentVersion;
      }
    >();
    if (!unique.length) return result;
    const active = await this.documentRepository.find({
      where: { id: In(unique), deleted: false },
    });
    const activeIds = new Set(active.map((document) => document.id));
    if (!activeIds.size) return result;
    const versions = (
      await this.versionRepository.find({
        where: {
          documentId: In([...activeIds]),
          status: DocumentStatus.PUBLISHED,
        },
      })
    ).filter(
      (version) =>
        version.status === DocumentStatus.PUBLISHED &&
        activeIds.has(version.documentId),
    );
    const dates = await this.publishedDates(versions.map((version) => version.id));
    for (const version of versions) {
      const current = result.get(version.documentId);
      const publishedAt = dates.get(version.id) ?? Number(version.createdAt);
      if (
        !current ||
        version.versionNumber > current.versionNumber ||
        (version.versionNumber === current.versionNumber &&
          publishedAt > current.publishedAt)
      ) {
        result.set(version.documentId, {
          versionNumber: version.versionNumber,
          publishedAt,
          version,
        });
      }
    }
    return result;
  }

  private async publishedDates(versionIds: number[]) {
    const dates = new Map<number, number>();
    if (!versionIds.length) return dates;
    const contributors = await this.contributorRepository.find({
      where: { documentVersionId: In(versionIds) },
      relations: ["actions"],
    });
    for (const contributor of contributors) {
      for (const action of contributor.actions ?? []) {
        if (action.type !== DocumentActionType.PUBLISHED) continue;
        const created = Number(action.createdDate);
        const current = dates.get(contributor.documentVersionId) ?? 0;
        if (created >= current) {
          dates.set(contributor.documentVersionId, created);
        }
      }
    }
    return dates;
  }

  private async activeDocumentIds(documentIds: string[]): Promise<Set<string>> {
    const unique = [...new Set(documentIds)];
    if (!unique.length) return new Set();
    const active = await this.documentRepository.find({
      where: { id: In(unique), deleted: false },
    });
    return new Set(active.map((document) => document.id));
  }

  private async assertShare(code: string, scope: ShareCodeScope) {
    const payload = this.readPayload(code, scope);
    const share = await this.shareRepository.findOne({
      where: { id: payload.sid },
    });
    if (
      !share ||
      share.revokedAt ||
      share.implementationId !== payload.impl ||
      Number(share.expiresAt) < Date.now() ||
      payload.exp < Date.now()
    ) {
      this.invalidShare();
    }
    const actual = Buffer.from(hashShareEmail(payload.email), "hex");
    const expected = Buffer.from(share.recipientEmailHash, "hex");
    if (
      actual.length !== expected.length ||
      actual.length === 0 ||
      !crypto.timingSafeEqual(actual, expected)
    ) {
      this.invalidShare();
    }
    return share;
  }

  private readPayload(code: string, scope: ShareCodeScope): ShareCodePayload {
    const payload = openShareCode(code, this.codeSecret());
    if (!payload || payload.scope !== scope) this.invalidShare();
    if (scope === "document" && payload.doc == null) this.invalidShare();
    return payload;
  }

  private invalidShare(): never {
    throw new NotFoundException(standardHttpError("STANDARD_031"));
  }

  private createSession(bytes: Buffer): string {
    this.sweepSessions();
    while (this.sessions.size >= MAX_SESSIONS) {
      const oldest = [...this.sessions.values()].sort(
        (left, right) => left.expiresAt - right.expiresAt,
      )[0];
      if (!oldest) break;
      this.sessions.delete(oldest.id);
    }
    const id = crypto.randomUUID();
    this.sessions.set(id, {
      id,
      expiresAt: Date.now() + SESSION_TTL_MS,
      bytes,
      chunkSize: this.chunkSize,
      maskSecret: crypto.randomBytes(32),
      ready: new Map(),
    });
    return id;
  }

  private takeSession(sessionId: string): ContentSession {
    this.sweepSessions();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
      throw new NotFoundException(standardHttpError("STANDARD_032"));
    }
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      throw new NotFoundException(standardHttpError("STANDARD_032"));
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  private parseIndex(indexValue: string, session: ContentSession): number {
    if (!/^\d+$/.test(indexValue)) {
      throw new BadRequestException(standardHttpError("STANDARD_032"));
    }
    const index = Number(indexValue);
    const count = Math.ceil(session.bytes.length / session.chunkSize);
    if (index < 0 || index >= count) {
      throw new BadRequestException(standardHttpError("STANDARD_032"));
    }
    return index;
  }

  private chunkAt(session: ContentSession, index: number): Buffer {
    const start = index * session.chunkSize;
    return session.bytes.subarray(
      start,
      Math.min(start + session.chunkSize, session.bytes.length),
    );
  }

  private sweepSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(id);
    }
  }

  private codeSecret(): string {
    const secret =
      this.configService.get<string>("SHARE_CODE_SECRET") ||
      this.configService.get<string>("SECRET_KEY");
    if (!secret) {
      throw new BadRequestException(standardHttpError("STANDARD_034"));
    }
    return secret;
  }

  private frontendBase(): string {
    const configured = this.configService.get<string>("FRONTEND_URL");
    if (!configured) {
      throw new BadRequestException(standardHttpError("STANDARD_034"));
    }
    return configured.replace(/\/$/, "");
  }

  private shareEmailHtml(
    standardName: string,
    link: string,
    expiresAt: number,
  ): string {
    const name = escapeHtml(standardName);
    const href = escapeHtml(link);
    const expiry = escapeHtml(new Date(expiresAt).toISOString().slice(0, 10));
    return `<!doctype html>
<html>
  <body style="font-family: sans-serif; color: #171717;">
    <p>You have been sent a read-only copy of the <strong>${name}</strong> document list.</p>
    <p>Open the list, then open each document from its own link. No account is required. This invitation expires on ${expiry}.</p>
    <p><a href="${href}">Open the read-only list</a></p>
    <p style="word-break: break-all;">${href}</p>
  </body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
