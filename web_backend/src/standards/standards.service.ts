import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { Document } from "../document/document.entity";
import { User } from "../user/user.entity";
import {
  CreateImplementationDocumentDto,
  CreateImplementationDto,
  UpdateImplementationDocumentDto,
} from "./dtos";
import { StandardImplementationDocument } from "./standard-implementation-document.entity";
import { StandardImplementation } from "./standard-implementation.entity";
import {
  ImplementationDocumentStatus,
  ImplementationStatus,
  RequiredDocumentKind,
} from "./standards.enums";
import {
  computeImplementationStatus,
  countImplemented,
  getStandard,
  listStandards,
  snapshotRequiredDocuments,
} from "./standards.catalog";
import { standardHttpError } from "./standards.errors";

type LinkedDocumentSummary = {
  id: string;
  title: string;
  documentCode: string;
};

type ImplementationDocumentView = {
  id: number;
  documentKey: string;
  title: string;
  clause: string;
  custom: boolean;
  description: string;
  kind: string;
  status: string;
  sortOrder: number;
  linkedDocument: LinkedDocumentSummary | null;
  linkedDocuments: LinkedDocumentSummary[];
  updatedAt: number;
};

type ImplementationView = {
  id: number;
  standardKey: string;
  standardName: string;
  status: ImplementationStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: { id: string; fname: string; lname: string } | null;
  completedCount: number;
  totalCount: number;
  documents: ImplementationDocumentView[];
};

@Injectable()
export class StandardsService {
  constructor(
    @InjectRepository(StandardImplementation)
    private readonly implementationRepository: Repository<StandardImplementation>,
    @InjectRepository(StandardImplementationDocument)
    private readonly implementationDocumentRepository: Repository<StandardImplementationDocument>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  listCatalog() {
    return listStandards().map((standard) => ({
      key: standard.key,
      name: standard.name,
      shortName: standard.shortName,
      year: standard.year,
      family: standard.family,
      description: standard.description,
      requiredDocuments: standard.requiredDocuments,
    }));
  }

  async listStandardsWithImplementations() {
    const implementations = await this.implementationRepository.find({
      relations: ["documents"],
    });
    const byKey = new Map(
      implementations.map((implementation) => [
        implementation.standardKey,
        implementation,
      ]),
    );

    const standards = this.listCatalog();
    await Promise.all(
      [...byKey.values()].map((implementation) =>
        this.syncMissingDocuments(implementation),
      ),
    );

    return standards.map((standard) => {
      const implementation = byKey.get(standard.key);
      return {
        ...standard,
        implementation: implementation
          ? {
              id: implementation.id,
              status: implementation.status,
              completedCount: countImplemented(implementation.documents ?? []),
              totalCount: implementation.documents?.length ?? 0,
            }
          : null,
      };
    });
  }

  async listImplementations(): Promise<ImplementationView[]> {
    const implementations = await this.implementationRepository.find({
      relations: ["documents", "documents.linkedDocument", "createdBy"],
      order: { createdAt: "DESC" },
    });
    await Promise.all(
      implementations.map(async (implementation) => {
        await this.syncMissingDocuments(implementation);
        await this.hydrateLinkedDocuments(implementation.documents ?? []);
      }),
    );
    return implementations.map((implementation) =>
      this.toImplementationView(implementation),
    );
  }

  async getImplementation(id: number): Promise<ImplementationView> {
    const implementation = await this.findImplementation(id);
    return this.toImplementationView(implementation);
  }

  async createImplementation(
    dto: CreateImplementationDto,
    user: User,
  ): Promise<ImplementationView> {
    const standard = getStandard(dto.standardKey);
    if (!standard) {
      throw new NotFoundException(standardHttpError("STANDARD_001"));
    }

    const existing = await this.implementationRepository.findOne({
      where: { standardKey: standard.key },
    });
    if (existing) {
      throw new BadRequestException(standardHttpError("STANDARD_004"));
    }

    const now = Date.now();
    try {
      const saved = await this.implementationRepository.save(
        this.implementationRepository.create({
          standardKey: standard.key,
          standardName: standard.name,
          status: ImplementationStatus.IN_PROGRESS,
          createdById: user.id,
          createdAt: now,
          updatedAt: now,
          documents: snapshotRequiredDocuments(standard, now) as StandardImplementationDocument[],
        }),
      );
      return this.getImplementation(saved.id);
    } catch (error) {
      throw new BadRequestException(
        standardHttpError("STANDARD_006", { cause: error }),
      );
    }
  }

  async createImplementationDocument(
    implementationId: number,
    dto: CreateImplementationDocumentDto,
  ): Promise<ImplementationView> {
    const implementation = await this.findImplementation(implementationId);
    const clause = dto.clause.trim();
    if (!clause) {
      throw new BadRequestException(standardHttpError("STANDARD_011"));
    }
    const now = Date.now();
    const sortOrder =
      Math.max(-1, ...implementation.documents.map((item) => item.sortOrder)) +
      1;
    const row = this.implementationDocumentRepository.create({
      implementation,
      implementationId: implementation.id,
      documentKey: `custom-${randomUUID()}`,
      title: dto.title?.trim() || clause,
      clause,
      description: "",
      kind: dto.kind ?? RequiredDocumentKind.MAINTAIN,
      status: ImplementationDocumentStatus.NOT_STARTED,
      custom: true,
      sortOrder,
      updatedAt: now,
      linkedDocumentId: null,
      linkedDocument: null,
      linkedDocumentIds: [],
    });
    try {
      await this.implementationDocumentRepository.save(row);
    } catch (error) {
      throw new BadRequestException(
        standardHttpError("STANDARD_011", { cause: error }),
      );
    }
    return this.getImplementation(implementationId);
  }

  async updateImplementationDocument(
    implementationId: number,
    documentId: number,
    dto: UpdateImplementationDocumentDto,
  ): Promise<ImplementationView> {
    const implementation = await this.findImplementation(implementationId);
    const document = implementation.documents.find(
      (item) => item.id === documentId,
    );
    if (!document) {
      throw new NotFoundException(standardHttpError("STANDARD_007"));
    }

    const now = Date.now();
    if (dto.status) {
      document.status = dto.status;
    }
    if (document.custom) {
      if (dto.clause !== undefined) {
        const clause = dto.clause.trim();
        if (!clause) {
          throw new BadRequestException(standardHttpError("STANDARD_009"));
        }
        document.clause = clause;
      }
      if (dto.title !== undefined) {
        const title = dto.title.trim();
        document.title = title || document.clause;
      }
    }
    if (dto.linkedDocumentIds !== undefined) {
      await this.setLinkedDocuments(document, dto.linkedDocumentIds);
    } else if (dto.linkedDocumentId !== undefined) {
      const single =
        dto.linkedDocumentId === null || dto.linkedDocumentId === ""
          ? []
          : [dto.linkedDocumentId];
      await this.setLinkedDocuments(document, single);
    }
    document.updatedAt = now;

    try {
      await this.implementationDocumentRepository.save(document);
      implementation.status = computeImplementationStatus(
        implementation.documents,
      );
      implementation.updatedAt = now;
      await this.implementationRepository.save(implementation);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        standardHttpError("STANDARD_009", { cause: error }),
      );
    }

    return this.getImplementation(implementationId);
  }

  async deleteImplementationDocument(
    implementationId: number,
    documentId: number,
  ): Promise<ImplementationView> {
    const implementation = await this.findImplementation(implementationId);
    const document = implementation.documents.find(
      (item) => item.id === documentId,
    );
    if (!document) {
      throw new NotFoundException(standardHttpError("STANDARD_007"));
    }
    if (!document.custom) {
      throw new BadRequestException(standardHttpError("STANDARD_012"));
    }
    try {
      await this.implementationDocumentRepository.remove(document);
    } catch (error) {
      throw new BadRequestException(
        standardHttpError("STANDARD_009", { cause: error }),
      );
    }
    return this.getImplementation(implementationId);
  }

  async deleteImplementation(id: number): Promise<void> {
    const implementation = await this.implementationRepository.findOne({
      where: { id },
    });
    if (!implementation) {
      throw new NotFoundException(standardHttpError("STANDARD_005"));
    }
    try {
      await this.implementationRepository.remove(implementation);
    } catch (error) {
      throw new BadRequestException(
        standardHttpError("STANDARD_010", { cause: error }),
      );
    }
  }

  private async findImplementation(
    id: number,
  ): Promise<StandardImplementation> {
    const implementation = await this.implementationRepository.findOne({
      where: { id },
      relations: ["documents", "documents.linkedDocument", "createdBy"],
    });
    if (!implementation) {
      throw new NotFoundException(standardHttpError("STANDARD_005"));
    }
    await this.syncMissingDocuments(implementation);
    await this.hydrateLinkedDocuments(implementation.documents ?? []);
    implementation.documents = [...(implementation.documents ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    return implementation;
  }

  private async syncMissingDocuments(
    implementation: StandardImplementation,
  ): Promise<void> {
    const standard = getStandard(implementation.standardKey);
    if (!standard) return;

    const documents = implementation.documents ?? [];
    const present = new Set(documents.map((document) => document.documentKey));
    const missing = standard.requiredDocuments
      .map((document, index) => ({ document, index }))
      .filter(({ document }) => !present.has(document.key));
    if (missing.length === 0) return;

    const now = Date.now();
    const created = missing.map(({ document, index }) =>
      this.implementationDocumentRepository.create({
        implementation,
        implementationId: implementation.id,
        documentKey: document.key,
        title: document.title,
        clause: document.clause,
        description: document.description,
        kind: document.kind,
        status: ImplementationDocumentStatus.NOT_STARTED,
        custom: false,
        sortOrder: index,
        updatedAt: now,
        linkedDocumentId: null,
        linkedDocument: null,
        linkedDocumentIds: [],
      }),
    );
    const saved = await this.implementationDocumentRepository.save(created);
    documents.push(...(Array.isArray(saved) ? saved : [saved]));
    implementation.documents = documents;

    const status = computeImplementationStatus(documents);
    if (status === implementation.status) return;
    implementation.status = status;
    implementation.updatedAt = now;
    await this.implementationRepository.update(implementation.id, {
      status,
      updatedAt: now,
    });
  }

  private toImplementationView(
    implementation: StandardImplementation,
  ): ImplementationView {
    const documents = [...(implementation.documents ?? [])].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    return {
      id: implementation.id,
      standardKey: implementation.standardKey,
      standardName: implementation.standardName,
      status: implementation.status,
      createdAt: Number(implementation.createdAt),
      updatedAt: Number(implementation.updatedAt),
      createdBy: implementation.createdBy
        ? {
            id: implementation.createdBy.id,
            fname: implementation.createdBy.fname,
            lname: implementation.createdBy.lname,
          }
        : null,
      completedCount: countImplemented(documents),
      totalCount: documents.length,
      documents: documents.map((document) => ({
        id: document.id,
        documentKey: document.documentKey,
        title: document.title,
        clause: document.clause,
        custom: Boolean(document.custom),
        description: document.description,
        kind: document.kind,
        status: document.status,
        sortOrder: document.sortOrder,
        linkedDocument: this.linkedSummary(this.resolvedLinks(document)[0]),
        linkedDocuments: this.resolvedLinks(document)
          .map((item) => this.linkedSummary(item))
          .filter((item): item is LinkedDocumentSummary => item !== null),
        updatedAt: Number(document.updatedAt),
      })),
    };
  }

  private resolvedLinks(document: StandardImplementationDocument): Document[] {
    const attached = (
      document as StandardImplementationDocument & { resolvedLinks?: Document[] }
    ).resolvedLinks;
    if (attached) return attached;
    return document.linkedDocument ? [document.linkedDocument] : [];
  }

  private linkedSummary(document?: Document | null): LinkedDocumentSummary | null {
    if (!document) return null;
    return {
      id: document.id,
      title: document.title,
      documentCode: document.documentCode,
    };
  }

  private async setLinkedDocuments(
    document: StandardImplementationDocument,
    ids: string[],
  ): Promise<void> {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    const found = unique.length
      ? await this.documentRepository.find({
          where: { id: In(unique), deleted: false },
        })
      : [];
    if (found.length !== unique.length) {
      throw new NotFoundException(standardHttpError("STANDARD_008"));
    }
    const byId = new Map(found.map((item) => [item.id, item]));
    const ordered = unique.map((id) => byId.get(id)).filter(Boolean) as Document[];
    document.linkedDocumentIds = ordered.map((item) => item.id);
    document.linkedDocument = ordered[0] ?? null;
    document.linkedDocumentId = ordered[0]?.id ?? null;
    (
      document as StandardImplementationDocument & { resolvedLinks?: Document[] }
    ).resolvedLinks = ordered;
  }

  private async hydrateLinkedDocuments(
    documents: StandardImplementationDocument[],
  ): Promise<void> {
    const ids = [
      ...new Set(
        documents.flatMap((document) => this.storedLinkIds(document)),
      ),
    ];
    const found = ids.length
      ? await this.documentRepository.find({
          where: { id: In(ids), deleted: false },
        })
      : [];
    const byId = new Map(found.map((item) => [item.id, item]));
    for (const document of documents) {
      const ordered = this.storedLinkIds(document)
        .map((id) => byId.get(id))
        .filter((item): item is Document => Boolean(item));
      (
        document as StandardImplementationDocument & { resolvedLinks?: Document[] }
      ).resolvedLinks = ordered;
      document.linkedDocument = ordered[0] ?? null;
    }
  }

  private storedLinkIds(document: StandardImplementationDocument): string[] {
    if (Array.isArray(document.linkedDocumentIds)) {
      return document.linkedDocumentIds.filter(Boolean);
    }
    return document.linkedDocumentId ? [document.linkedDocumentId] : [];
  }
}
