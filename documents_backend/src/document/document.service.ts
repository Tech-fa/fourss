import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Like, Not, Repository } from "typeorm";
import { Document, ContentType } from "./document.entity";
import { DocumentType } from "./document-type.entity";
import { DocumentVersion } from "./document-version.entity";
import {
  DocumentTypeDto,
  DocumentFilterDto,
  DocumentStatus,
  CreateApprovalStrategyDto,
  ViewApprovalStrategyDto,
  CreateDocumentAcknowledgementDto,
  ViewDocumentAcknowledgementDto,
  ViewDocumentDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateDocumentVersionDto,
  UploadVersionEditorContentDto,
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  ReviewChangeRequestDto,
  ChangeRequestDto,
  ChangeRequestFilterDto,
  ViewChangeRequestDto,
  CreateDocumentTemplateDto,
  DocumentTemplateFilterDto,
  DocumentTemplateDto,
  CreateDocumentDraftDto,
  UpdateDocumentDraftDto,
  DocumentDraftFilterDto,
  DocumentDraftListItemDto,
  DocumentDraftDetailDto,
  CreateDocumentChecklistDto,
  UploadVersionChecklistDto,
  ApprovalStrategyParticipantDto,
} from "./dtos";
import { ApprovalStrategy } from "./approval-strategy.entity";
import { DocumentAcknowledgement } from "./document-acknowledgement.entity";
import { DocumentAcknowledgementUnit } from "./document-acknowledgement-unit.entity";
import { DocumentAcknowledgementUser } from "./document-acknowledgement-user.entity";
import { DocumentApprover } from "./document-approver.entity";
import { User } from "../user/user.entity";
import { UsersService } from "../user/user.service";
import { TeamService } from "../teams/team.service";
import { v4 as uuidv4 } from "uuid";
import { LocalFileService } from "../common/local-file.service";
import { PaginatedResponse, PaginationDto } from "../common/pagination";
import { DocumentContributor } from "./document-contributor.entity";
import { DocumentContentContributor } from "./document-content-contributor.entity";
import {
  planContentContributorAdd,
  userCanEditDocumentContent,
} from "./document-content-access";
import { DocumentAction } from "./document-action.entity";
import { DocumentActionType } from "./document-action.entity";
import { ChangeRequest, ChangeRequestStatus } from "./change-request.entity";
import { Comment } from "../common/comment.entity";
import { CreateDocumentActionDto } from "./dtos";
import { Team } from "../teams/team.entity";
import { ApprovalStrategyTeam } from "./approval-strategy-team.entity";
import { UserRequest } from "../permissions/dto";
import { PermissionService } from "../permissions/permission.service";
import { Brackets } from "typeorm";
import { DocumentPermission } from "../permissions/permissions";
interface DataReviewDto {
  id: string | number;
  name: string;
  description?: string;
  status?: string;
  createdAt?: number;
  createdBy?: User;
  updatedAt?: number;
  link?: string;
  routeReplace?: string;
}
import { NotificationInfo } from "../notification/notification-handler/notification.interface";
import {
  NotificationInfoParam,
  NotificationInfoResponse,
  NotificationRecipient,
} from "../notification/notification-handler/dto";
import { DocumentTemplate } from "./document-template.entity";
import { DocumentDraft } from "./document-draft.entity";
import { DocumentErrorCode, documentHttpError } from "./document.errors";
import { QueuePublisher } from "../queue/queue.publisher";
import { EmailType } from "../common/dto";
import { I18nService } from "nestjs-i18n";
import { TeamMember } from "../teams/team-member.entity";
import { DocumentChecklist } from "./document-checklist.entity";
import { DocumentAiIndexService } from "./document-ai-index.service";

@Injectable()
export class DocumentService implements NotificationInfo {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentType)
    private docTypeRepo: Repository<DocumentType>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(ApprovalStrategy)
    private approvalStrategyRepo: Repository<ApprovalStrategy>,
    @InjectRepository(DocumentAcknowledgement)
    private documentAcknowledgementRepo: Repository<DocumentAcknowledgement>,
    @InjectRepository(DocumentApprover)
    private docApproverRepo: Repository<DocumentApprover>,
    @InjectRepository(DocumentContributor)
    private documentContributorRepository: Repository<DocumentContributor>,
    @InjectRepository(DocumentContentContributor)
    private contentContributorRepo: Repository<DocumentContentContributor>,
    @InjectRepository(DocumentAction)
    private documentActionRepository: Repository<DocumentAction>,
    @InjectRepository(ChangeRequest)
    private changeRequestRepository: Repository<ChangeRequest>,
    @InjectRepository(DocumentTemplate)
    private documentTemplateRepository: Repository<DocumentTemplate>,
    @InjectRepository(DocumentDraft)
    private documentDraftRepository: Repository<DocumentDraft>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private usersService: UsersService,
    private teamService: TeamService,
    private s3Service: LocalFileService,
    private permissionService: PermissionService,
    private queuePublisher: QueuePublisher,
    private readonly i18n: I18nService,
    private readonly documentAiIndexService: DocumentAiIndexService,
  ) {}
  private logger = new Logger(DocumentService.name);

  async createNewVersionOfDocuments(): Promise<number> {
    try {
      const now = Date.now();
      const expiringDocuments = await this.documentRepository
        .createQueryBuilder("document")
        .select(["document.id"])
        .where("document.deleted = :deleted", { deleted: false })
        .andWhere("document.dueDate IS NOT NULL")
        .andWhere("document.dueDate > 0")
        .andWhere("document.dueDate + 86400000 <= :now", { now })
        .andWhereExists(
          this.versionRepo
            .createQueryBuilder("document_versions")
            .select("1")
            .where("document_versions.document_id = document.id")
            .andWhere("document_versions.status = :status", {
              status: DocumentStatus.PUBLISHED,
            })
            .andWhere(
              "document_versions.version_number = (SELECT MAX(dv2.version_number) FROM document_versions dv2 WHERE dv2.document_id = document.id)",
            ),
        )
        .getMany();

      if (!expiringDocuments || expiringDocuments.length === 0) {
        return 0;
      }

      for (const document of expiringDocuments) {
        const newVersion = this.versionRepo.create({
          document,
          versionNumber: document.currentVersion + 1,
          content: document.description,
          file: "",
          changes: undefined,
          status: DocumentStatus.PENDING,
          createdAt: now,
        });
        await this.versionRepo.save(newVersion);
      }
      return expiringDocuments.length;
    } catch (error) {
      this.logger.error(
        "Error marking documents obsolete",
        error?.stack || error,
      );
      throw error;
    }
  }

  private async obsoleteVersionsBefore(
    documentId: string,
    beforeVersionNumber: number,
    versions?: DocumentVersion[],
  ): Promise<void> {
    const allVersions =
      versions ??
      (await this.versionRepo.find({
        where: { documentId },
      }));
    const toExpire = allVersions.filter(
      (version) =>
        version.versionNumber < beforeVersionNumber &&
        version.status !== DocumentStatus.OBSOLETE,
    );
    if (!toExpire.length) {
      return;
    }
    for (const version of toExpire) {
      await this.purgeDraftsLinkedToVersion(version, DocumentStatus.OBSOLETE);
      version.status = DocumentStatus.OBSOLETE;
    }
    await this.versionRepo.save(toExpire);
  }

  private async expireDocumentVersions(
    document: Document,
    options: { includeNewerThanCurrent?: boolean } = {},
  ): Promise<void> {
    const includeNewer = options.includeNewerThanCurrent === true;
    const toExpire = (document.versions ?? []).filter(
      (version) =>
        version.status !== DocumentStatus.OBSOLETE &&
        (includeNewer || version.versionNumber <= document.currentVersion),
    );
    if (!toExpire.length) {
      await this.documentRepository.update({ id: document.id }, { dueDate: 0 });
      return;
    }

    for (const version of toExpire) {
      await this.purgeDraftsLinkedToVersion(version, DocumentStatus.OBSOLETE);
      version.status = DocumentStatus.OBSOLETE;
    }
    await this.versionRepo.save(toExpire);

    const current =
      toExpire.find(
        (version) => version.versionNumber === document.currentVersion,
      ) ||
      toExpire.reduce((max, version) =>
        version.versionNumber > max.versionNumber ? version : max,
      );
    await this.documentRepository.update(
      { id: document.id },
      { currentVersion: current.versionNumber, dueDate: 0 },
    );
  }

  async expireDocumentsPastDueDate(): Promise<number> {
    try {
      const now = Date.now();
      const expiringDocuments = await this.documentRepository
        .createQueryBuilder("document")
        .leftJoinAndSelect("document.versions", "version")
        .where("document.deleted = :deleted", { deleted: false })
        .andWhere("document.dueDate IS NOT NULL")
        .andWhere("document.dueDate > 0")
        .andWhere("document.dueDate + 86400000 <= :now", { now })
        .getMany();

      if (!expiringDocuments.length) {
        return 0;
      }

      let expiredCount = 0;
      for (const document of expiringDocuments) {
        await this.expireDocumentVersions(document);
        expiredCount += 1;
      }
      return expiredCount;
    } catch (error) {
      this.logger.error(
        "Error marking documents expired",
        error?.stack || error,
      );
      throw error;
    }
  }

  async createDocument(dto: CreateDocumentDto, user: any, file: any) {
    const {
      documentDraftId,
      checklist: checklistInput,
      processIds,
      ...dtoBody
    } = dto;
    const contentType = dtoBody.contentType || ContentType.FILE;
    const checklistDto = this.resolveChecklistDto(
      contentType,
      checklistInput,
      true,
    );

    if (documentDraftId) {
      const draft = await this.documentDraftRepository.findOne({
        where: { id: documentDraftId },
      });
      if (!draft) {
        throw new NotFoundException(documentHttpError("DOC_085"));
      }
      if (draft.documentId) {
        await this.assertDocumentTeamAccessForDraft(draft.documentId, user);
      }
    }

    const queryRunner = this.documentRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (contentType !== ContentType.CHECKLIST && !file) {
        throw new BadRequestException(documentHttpError("DOC_001"));
      }

      const docType = await this.docTypeRepo.findOne({
        where: { id: dtoBody.documentTypeId },
      });

      const team = await this.teamService.findById(dtoBody.teamId);
      if (
        !(
          await this.permissionService.usersWithAccess(
            [team?.id ?? 0],
            user,
            DocumentPermission.subject,
            false,
            user.id,
          )
        ).length
      ) {
        throw new NotFoundException(documentHttpError("DOC_002"));
      }

      if (!docType || !team) {
        throw new NotFoundException(documentHttpError("DOC_003"));
      }

      const approvalStrategy = await this.resolveApprovalStrategy(
        docType.id,
        team.id,
      );

      if (!approvalStrategy) {
        throw new BadRequestException(documentHttpError("DOC_004"));
      }

      const documentAcknowledgement = await this.resolveDocumentAcknowledgement(
        docType.id,
        team.id,
      );
      const existingDocCode = await this.documentRepository.findOne({
        where: {
          documentCode: dtoBody.documentCode,
          team: { id: team.id },
        },
      });
      if (existingDocCode) {
        throw new ConflictException(documentHttpError("DOC_005"));
      }

      let documentTemplate: DocumentTemplate | null = null;
      if (dtoBody.documentTemplateId) {
        const template = await this.documentTemplateRepository.findOne({
          where: {
            id: dtoBody.documentTemplateId,
            deleted: false,
          },
        });
        if (!template) {
          throw new NotFoundException(documentHttpError("DOC_006"));
        }
        documentTemplate = template;
      }

      const document = this.documentRepository.create({
        id: uuidv4(),
        ...dtoBody,
        createdAt: new Date().valueOf(),
        updatedAt: new Date().valueOf(),
        documentType: docType,
        team: team,
        createdBy: { id: user.id } as User,
        currentVersion: dtoBody.versionNumber || 1,
        isPublic: dtoBody.isPublic === "true" ? true : false,
        isAiAccessible: dtoBody.isAiAccessible === "true",
        approvalStrategy: approvalStrategy,
        documentAcknowledgement: documentAcknowledgement ?? undefined,
        contentType,
        documentTemplate: documentTemplate ?? undefined,
      });

      await queryRunner.manager.getRepository(Document).save(document);

      const docVersion = this.versionRepo.create({
        ...dtoBody,
        versionNumber: dtoBody.versionNumber || 1,
        document,
        content: dtoBody.description,
        createdAt: new Date().valueOf(),
        file: "",
        changes: dtoBody.changes || undefined,
        createdBy: { id: user.id },
        createdById: user.id,
        status: await this.resolveInitialWorkflowStatus(
          approvalStrategy,
          team.id,
          user,
        ),
      });

      await queryRunner.manager.getRepository(DocumentVersion).save(docVersion);
      let fileUrl = "";
      if (file && contentType !== ContentType.CHECKLIST) {
        fileUrl = await this.s3Service.uploadFile(file);
      }
      if (contentType === ContentType.EDITOR) {
        docVersion.content = fileUrl;
      } else if (contentType === ContentType.CHECKLIST) {
        docVersion.checklist = this.createChecklist(checklistDto!);
      } else {
        docVersion.file = fileUrl;
      }

      await queryRunner.manager.save(docVersion);

      await queryRunner.commitTransaction();

      if (documentDraftId) {
        await this.deleteDocumentDraft(documentDraftId, user);
      }

      this.enqueueDocumentAiIndex(document.id, docVersion.id);

      return { id: document.id, version: docVersion.versionNumber };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_019", { cause: error }),
      );
    } finally {
      await queryRunner.release();
    }
  }

  createChecklist(dto: CreateDocumentChecklistDto): DocumentChecklist {
    const checklist = new DocumentChecklist(dto);
    checklist.createdAt = Date.now();
    checklist.updatedAt = Date.now();
    checklist.questions.forEach((question, index) => {
      question.createdAt = Date.now();
      question.updatedAt = Date.now();
      if (question.orderIndex == null) {
        question.orderIndex = index;
      }
    });
    return checklist;
  }

  private resolveChecklistDto(
    contentType: ContentType | string | undefined,
    checklistInput: CreateDocumentChecklistDto | string | undefined,
    requiredForChecklist: boolean,
  ): CreateDocumentChecklistDto | undefined {
    if (contentType !== ContentType.CHECKLIST) {
      return undefined;
    }

    let checklist = checklistInput;
    if (typeof checklist === "string") {
      try {
        checklist = JSON.parse(checklist) as CreateDocumentChecklistDto;
      } catch {
        throw new BadRequestException(documentHttpError("DOC_116"));
      }
    }

    if (requiredForChecklist && (!checklist || !checklist.questions?.length)) {
      throw new BadRequestException(documentHttpError("DOC_113"));
    }

    return checklist;
  }

  async getDocuments(
    user: UserRequest,
    paginationDto: PaginationDto,
    filterDto: DocumentFilterDto,
  ): Promise<PaginatedResponse<Document>> {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const qb = this.documentRepository
      .createQueryBuilder("document")
      .leftJoinAndSelect("document.documentType", "documentType")
      .leftJoinAndSelect("document.team", "team")
      .leftJoinAndSelect("document.createdBy", "createdBy")
      .leftJoinAndSelect(
        "document.versions",
        "latestVersion",
        `latestVersion.version_number = document.current_version`,
      )
      .leftJoinAndMapMany(
        "document.newVersions",
        "document.versions",
        "newVersion",
        `newVersion.version_number > document.current_version`,
      )

      .where("document.deleted = :deleted", { deleted: false });

    // Add search filter if provided
    if (filterDto.search) {
      //or document.documentcode
      qb.andWhere(
        "(LOWER(document.title) LIKE :search OR LOWER(document.documentCode) LIKE :search)",
        {
          search: `%${filterDto.search.toLowerCase()}%`,
        },
      );
    }

    // Add status filter if provided
    if (filterDto.status) {
      qb.andWhere("latestVersion.status = :status", {
        status: filterDto.status,
      });
    }

    // Add category filter if provided
    if (filterDto.category) {
      qb.andWhere("documentType.id = :category", {
        category: filterDto.category,
      });
    }

    // Add content type filter if provided
    if (filterDto.contentType) {
      qb.andWhere("document.contentType = :contentType", {
        contentType: filterDto.contentType,
      });
    }

    // Add team filter if provided
    if (filterDto.team) {
      qb.andWhere("team.id = :team", {
        team: filterDto.team,
      });
    }

    if (filterDto.processId) {
      qb.innerJoin("document.processLinks", "processLink").andWhere(
        "processLink.processId = :processId",
        {
          processId: filterDto.processId,
        },
      );
    }

    qb.andWhere(
      new Brackets((qb) => {
        qb.where("team.id IN (:...teamIds)", {
          teamIds: user.teamIds,
        }).orWhere("document.isPublic = :isPublic", { isPublic: true });
      }),
    );

    const sortMap: Record<string, string> = {
      title: "document.title",
      documentCode: "document.documentCode",
      createdAt: "document.createdAt",
    };
    const sortByKey = filterDto?.sortBy as string | undefined;
    const sortDirRaw = (filterDto?.sortDir as string | undefined) || "asc";
    const sortColumn =
      sortByKey && sortMap[sortByKey]
        ? sortMap[sortByKey]
        : "document.createdAt";
    const sortDirection = sortDirRaw.toLowerCase() === "desc" ? "DESC" : "ASC";
    qb.orderBy(sortColumn, sortDirection as "ASC" | "DESC");

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply pagination
    const documents = await qb
      .skip(skip)
      .take(perPage)
      .select([
        "document.id",
        "document.title",
        "document.documentCode",
        "document.contentType",
        "document.createdAt",
        "document.updatedAt",
        "document.isPublic",
        "document.isAiAccessible",
        "document.currentVersion",
        "documentType.id",
        "documentType.name",
        "team.id",
        "team.name",
        "createdBy.id",
        "createdBy.fname",
        "createdBy.lname",
        "latestVersion.file",
        "latestVersion.status",
        "newVersion.status",
      ])
      .getMany();

    // Get change request counts for each document

    const documentsWithChangeRequests = documents.map((doc) => ({
      ...doc,
      totalChangeRequests: 0,
    }));

    return {
      data: documentsWithChangeRequests,
      currentPage: page,
      totalCount: total,
      perPage,
    };
  }

  async getDocumentById(id: string, user: UserRequest): Promise<any> {
    const qb = this.documentRepository
      .createQueryBuilder("document")
      .leftJoinAndSelect("document.documentType", "documentType")
      .leftJoinAndSelect(
        "document.changeRequestDocuments",
        "changeRequestDocuments",
      )
      .leftJoinAndSelect(
        "changeRequestDocuments.changeRequest",
        "documentChangeRequest",
      )
      .leftJoinAndSelect("document.team", "team")
      .leftJoinAndSelect("document.documentTemplate", "documentTemplate")
      .leftJoinAndSelect("document.versions", "versions")
      .leftJoinAndSelect("versions.createdBy", "userVersions")
      .leftJoinAndSelect("versions.changeRequest", "changeRequest")
      .leftJoinAndSelect("versions.checklist", "checklist")
      .leftJoinAndSelect("checklist.questions", "checklistQuestions")
      .leftJoinAndSelect("document.contributors", "contributors")
      .leftJoinAndSelect("contributors.documentVersion", "contributorVersion")
      .leftJoinAndSelect("contributors.actions", "actions")
      .leftJoinAndSelect("actions.comment", "comment")
      .leftJoinAndSelect("contributors.user", "contributorUser")
      .leftJoinAndSelect("document.contentContributors", "contentContributors")
      .leftJoinAndSelect("contentContributors.user", "contentContributorUser")
      .leftJoinAndSelect("document.createdBy", "createdBy")
      .leftJoinAndSelect("document.approvalStrategy", "approvalStrategy")
      .leftJoinAndSelect(
        "approvalStrategy.documentApprovers",
        "strategyApprovers",
      )
      .leftJoinAndSelect("strategyApprovers.user", "strategyApproverUser")
      .leftJoinAndSelect(
        "document.documentAcknowledgement",
        "documentAcknowledgement",
      )
      .leftJoinAndSelect(
        "documentAcknowledgement.acknowledgementUsers",
        "acknowledgementUsers",
      )
      .leftJoinAndSelect("acknowledgementUsers.user", "acknowledgementUser")
      .where("document.id = :id", { id })
      .andWhere(
        new Brackets((qb) => {
          qb.where("team.id IN (:...teamIds)", {
            teamIds: user.teamIds,
          }).orWhere("document.isPublic = :isPublic", { isPublic: true });
        }),
      )
      .andWhere("document.deleted = :deleted", { deleted: false });

    const document = await qb.getOne();
    if (!document) {
      throw new NotFoundException(documentHttpError("DOC_007"));
    }

    if (!document.approvalStrategy) {
      document.approvalStrategy = await this.resolveApprovalStrategy(
        document.documentType.id,
        document.team.id,
      );
    }

    if (!document.documentAcknowledgement) {
      document.documentAcknowledgement = await this.resolveDocumentAcknowledgement(
        document.documentType.id,
        document.team.id,
      );
    }

    return document;
  }

  async getDocumentText(id: string, user: UserRequest) {
    const document = await this.getDocumentById(id, user);
    const stored = await this.documentAiIndexService.requireStoredText({
      id: document.id,
      isAiAccessible: !!document.isAiAccessible,
      currentVersion: document.currentVersion,
    });
    return {
      id: document.id,
      title: document.title,
      documentCode: document.documentCode,
      versionId: stored.versionId,
      text: stored.text,
    };
  }

  // Approval Strategy Methods
  private async resolveApprovalStrategy(
    documentTypeId: number,
    teamId: number,
  ): Promise<ApprovalStrategy> {
    const categoryStrategy = await this.getApprovalStrategyForCategory(
      documentTypeId,
    );
    if (categoryStrategy) {
      return categoryStrategy;
    }

    await this.ensureDefaultApprovalStrategy();
    const defaultStrategy = await this.getDefaultApprovalStrategy();
    return defaultStrategy as ApprovalStrategy;
  }

  private async getFirstTeam(): Promise<Team | null> {
    return this.approvalStrategyRepo.manager.getRepository(Team).findOne({
      where: { deleted: false },
      order: { id: "ASC" },
    });
  }

  private async getDefaultApprovalStrategy(): Promise<ApprovalStrategy | null> {
    return this.approvalStrategyRepo.findOne({
      where: {
        deleted: false,
        isDefault: true,
      },
      relations: [
        "teams",
        "teams.team",
        "documentApprovers",
        "documentApprovers.user",
      ],
    });
  }

  private async ensureDefaultApprovalStrategy(): Promise<void> {
    const firstTeam = await this.getFirstTeam();
    if (!firstTeam) {
      return;
    }

    let defaultStrategy = await this.approvalStrategyRepo.findOne({
      where: { deleted: false, isDefault: true },
      relations: ["teams", "teams.team"],
    });

    if (!defaultStrategy) {
      const orgStrategies = await this.approvalStrategyRepo.find({
        where: {
          deleted: false,
          documentType: IsNull(),
        },
        relations: ["teams", "teams.team"],
        order: { id: "ASC" },
      });

      defaultStrategy =
        orgStrategies.find((strategy) =>
          strategy.teams?.some((entry) => entry.team?.id === firstTeam.id),
        ) ??
        orgStrategies[0] ??
        null;

      if (!defaultStrategy) {
        defaultStrategy = this.approvalStrategyRepo.create({
          name: "Default Approval Strategy",
          isDefault: true,
          noReview: true,
          noApprove: true,
          requiredReviews: 0,
          requiredApprovals: 0,
          allApprovers: false,
          allReviewers: false,
          allowOrdering: false,
          documentType: null,
          teams: [
            {
              team: { id: firstTeam.id } as Team,
            } as ApprovalStrategyTeam,
          ],
          documentApprovers: [],
        });
        await this.approvalStrategyRepo.save(defaultStrategy);
        return;
      }

      defaultStrategy.isDefault = true;
    }

    const linkedTeamIds = (defaultStrategy.teams || [])
      .map((entry) => entry.team?.id)
      .filter((id): id is number => typeof id === "number");

    if (linkedTeamIds.length !== 1 || linkedTeamIds[0] !== firstTeam.id) {
      defaultStrategy.teams = [
        {
          team: { id: firstTeam.id } as Team,
        } as ApprovalStrategyTeam,
      ];
    }

    defaultStrategy.documentType = null;
    defaultStrategy.isDefault = true;
    await this.approvalStrategyRepo.save(defaultStrategy);

    await this.approvalStrategyRepo.update(
      {
        deleted: false,
        isDefault: true,
        id: Not(defaultStrategy.id),
      },
      { isDefault: false },
    );
  }

  private async getApprovalStrategyForCategory(
    documentTypeId: number,
  ): Promise<ApprovalStrategy | null> {
    return this.approvalStrategyRepo.findOne({
      where: {
        deleted: false,
        documentType: { id: documentTypeId },
      },
      relations: [
        "documentApprovers",
        "documentApprovers.user",
        "documentType",
      ],
    });
  }

  private async getApprovalStrategyForTeam(
    teamId: number,
  ): Promise<ApprovalStrategy | undefined> {
    // Get all approval strategies with their teams (through ApprovalStrategyTeam)
    const approvalStrategies = await this.approvalStrategyRepo.find({
      where: {
        deleted: false,
        documentType: IsNull(),
      },
      relations: [
        "teams",
        "teams.team",
        "documentApprovers",
        "documentApprovers.user",
      ],
    });

    for (const strategy of approvalStrategies) {
      const teamIds = strategy.teams.map(
        (strategyTeam) => strategyTeam.team.id,
      );
      if (teamIds.includes(teamId)) {
        return strategy;
      }
    }

    return undefined;
  }

  private async resolveDocumentAcknowledgement(
    documentTypeId: number,
    teamId: number,
  ): Promise<DocumentAcknowledgement | null> {
    const categoryAcknowledgement = await this.getDocumentAcknowledgementForCategory(
      documentTypeId,
    );
    if (categoryAcknowledgement) {
      return categoryAcknowledgement;
    }
    return this.getDocumentAcknowledgementForTeam(teamId);
  }

  private async getDocumentAcknowledgementForCategory(
    documentTypeId: number,
  ): Promise<DocumentAcknowledgement | null> {
    return this.documentAcknowledgementRepo.findOne({
      where: {
        deleted: false,
        documentType: { id: documentTypeId },
      },
      relations: [
        "acknowledgementUsers",
        "acknowledgementUsers.user",
        "documentType",
      ],
    });
  }

  private async getDocumentAcknowledgementForTeam(
    teamId: number,
  ): Promise<DocumentAcknowledgement | null> {
    const acknowledgements = await this.documentAcknowledgementRepo.find({
      where: {
        deleted: false,
        documentType: IsNull(),
      },
      relations: [
        "teams",
        "teams.team",
        "acknowledgementUsers",
        "acknowledgementUsers.user",
      ],
    });

    for (const acknowledgement of acknowledgements) {
      const teamIds = acknowledgement.teams.map((unit) => unit.team.id);
      if (teamIds.includes(teamId)) {
        return acknowledgement;
      }
    }

    return null;
  }

  private hasApprovalWorkflowStarted(document: {
    contributors?: Array<{ actions?: Array<{ type: DocumentActionType }> }>;
    versions?: Array<{ status: DocumentStatus }>;
  }): boolean {
    if (
      (document.versions ?? []).some(
        (v) => v.status === DocumentStatus.PUBLISHED,
      )
    ) {
      return true;
    }

    const lockActionTypes = new Set<DocumentActionType>([
      DocumentActionType.REVIEWED,
      DocumentActionType.REVIEWED_REJECTED,
      DocumentActionType.APPROVED,
      DocumentActionType.REJECTED,
      DocumentActionType.OVERRIDE_APPROVED,
      DocumentActionType.READY_FOR_APPROVAL,
      DocumentActionType.PUBLISHED,
    ]);

    return (document.contributors ?? []).some((contributor) =>
      (contributor.actions ?? []).some((action) =>
        lockActionTypes.has(action.type),
      ),
    );
  }

  private documentUsesCategoryApprovalStrategy(
    document: { approvalStrategy?: ApprovalStrategy | null },
    categoryStrategy: ApprovalStrategy | null,
  ): boolean {
    if (!categoryStrategy || !document.approvalStrategy) {
      return false;
    }
    return document.approvalStrategy.id === categoryStrategy.id;
  }

  private async applyWorkflowStatusAfterFirstVersionFill(
    document: Document,
    version: DocumentVersion,
    wasEmptyBefore: boolean,
    user: UserRequest,
  ): Promise<void> {
    if (!wasEmptyBefore || version.status !== DocumentStatus.PENDING) {
      return;
    }
    if (!document.approvalStrategy) {
      throw new BadRequestException(documentHttpError("DOC_008"));
    }
    const nextStatus = await this.resolveInitialWorkflowStatus(
      document.approvalStrategy,
      document.team.id,
      user,
    );
    await this.purgeDraftsLinkedToVersion(version, nextStatus);
    version.status = nextStatus;
  }

  private async publishDocumentCurrentVersionIfAutoPublished(
    document: Document,
    version: DocumentVersion,
  ): Promise<void> {
    if (version.status === DocumentStatus.PUBLISHED) {
      await this.documentRepository.update(
        { id: document.id },
        { currentVersion: version.versionNumber },
      );
      await this.obsoleteVersionsBefore(
        document.id,
        version.versionNumber,
        document.versions,
      );
    }
  }

  private async resolveInitialWorkflowStatus(
    approvalStrategy: ApprovalStrategy,
    teamId: number,
    user: UserRequest,
  ): Promise<DocumentStatus> {
    let requiresReview = !approvalStrategy.noReview;
    let requiresApprove = !approvalStrategy.noApprove;
    if (requiresReview && !approvalStrategy.allReviewers) {
      const strategyReviewers =
        approvalStrategy.documentApprovers
          ?.filter((reviewer) => reviewer.roleType === "reviewer")
          .map((reviewer) => reviewer.user) || [];
      const validReviewers = await this.filterRoleUsersByTeamMembership(
        strategyReviewers,
        teamId,
      );
      requiresReview = validReviewers.length > 0;
    }

    if (requiresApprove && !approvalStrategy.allApprovers) {
      const strategyApprovers =
        approvalStrategy.documentApprovers
          ?.filter((approver) => approver.roleType === "approver")
          .map((approver) => approver.user) || [];
      const validApprovers = await this.filterRoleUsersByTeamMembership(
        strategyApprovers,
        teamId,
      );
      requiresApprove = validApprovers.length > 0;
    }

    if (!requiresReview && !requiresApprove) {
      return DocumentStatus.PUBLISHED;
    }
    if (!requiresReview) {
      return DocumentStatus.READY_FOR_APPROVAL;
    }
    return DocumentStatus.PENDING;
  }

  private async getAcknowledgersForDocument(
    document: Document,
    user: UserRequest,
  ): Promise<
    Array<{ id: string; fname: string; lname: string; email: string }>
  > {
    if (!document.documentAcknowledgement) {
      document.documentAcknowledgement = await this.resolveDocumentAcknowledgement(
        document.documentType.id,
        document.team.id,
      );
    }

    const acknowledgement = document.documentAcknowledgement;
    if (!acknowledgement) {
      return [];
    }

    if (acknowledgement.allUsers) {
      return this.permissionService.usersWithAccess(
        [document.team.id],
        user,
        DocumentPermission.subject,
      );
    }

    if (!acknowledgement.acknowledgementUsers?.length) {
      return [];
    }

    const selectedUsers = acknowledgement.acknowledgementUsers
      .map((entry) => entry.user)
      .filter(Boolean);
    const selectedUserIds = Array.from(
      new Set(
        selectedUsers.map((selectedUser) => selectedUser.id).filter(Boolean),
      ),
    );

    if (!selectedUserIds.length) {
      return [];
    }

    const usersWithOrgAccess = await this.permissionService.usersWithAccess(
      [document.team.id],
      {
        id: "",
        username: "",
        teamIds: [],
      } as UserRequest,
      DocumentPermission.subject,
      false,
      selectedUserIds.join(","),
    );
    const validUserIds = new Set(
      usersWithOrgAccess.map((accessUser) => accessUser.id),
    );
    return selectedUsers
      .filter((selectedUser) => validUserIds.has(selectedUser.id))
      .map((selectedUser) => ({
        id: selectedUser.id,
        fname: selectedUser.fname,
        lname: selectedUser.lname,
        email: selectedUser.email,
      }));
  }

  async viewDocument(
    id: string,
    user: UserRequest,
    options?: { includeLatestPublishedContent?: boolean },
  ): Promise<ViewDocumentDto> {
    const document = await this.getDocumentById(id, user);
    let approvers: ApprovalStrategyParticipantDto[] = [];
    let reviewers: ApprovalStrategyParticipantDto[] = [];
    if (document.approvalStrategy?.allApprovers) {
      approvers = await this.permissionService.usersWithAccess(
        [document.team.id],
        user,
        DocumentPermission.subject,
      );
    } else {
      const strategyApprovers =
        document.approvalStrategy?.documentApprovers?.filter(
          (approver) => approver.roleType === "approver",
        ) || [];
      const validApprovers = await this.filterRoleUsersByTeamMembership(
        strategyApprovers.map((approver) => approver.user),
        document.team.id,
      );
      approvers = this.mapRoleUsersWithOrder(strategyApprovers, validApprovers);
    }

    if (document.approvalStrategy?.allReviewers) {
      reviewers = await this.permissionService.usersWithAccess(
        [document.team.id],
        user,
        DocumentPermission.subject,
      );
    } else {
      const strategyReviewers =
        document.approvalStrategy?.documentApprovers?.filter(
          (reviewer) => reviewer.roleType === "reviewer",
        ) || [];
      const validReviewers = await this.filterRoleUsersByTeamMembership(
        strategyReviewers.map((reviewer) => reviewer.user),
        document.team.id,
      );
      reviewers = this.mapRoleUsersWithOrder(strategyReviewers, validReviewers);
    }

    const acknowledgers = await this.getAcknowledgersForDocument(
      document,
      user,
    );

    let latestPublishedVersionContent: string | undefined;
    let latestPublishedVersionContentUrl: string | undefined;
    let pendingVersionContent: string | undefined;
    let pendingVersionContentUrl: string | undefined;
    if (
      options?.includeLatestPublishedContent &&
      document.contentType === ContentType.EDITOR &&
      document.versions?.length
    ) {
      const publishedVersions = document.versions
        .filter((v) =>
          [DocumentStatus.PUBLISHED, DocumentStatus.OBSOLETE].includes(
            v.status,
          ),
        )
        .sort((a, b) => b.versionNumber - a.versionNumber);
      const latestPublished = publishedVersions[0];
      if (latestPublished?.content) {
        const isDocx = latestPublished.content.toLowerCase().endsWith(".docx");
        try {
          if (isDocx) {
            latestPublishedVersionContentUrl = await this.s3Service.getSignedUrlForDownload(
              latestPublished.content,
            );
          } else {
            latestPublishedVersionContent = await this.s3Service.getFile(
              latestPublished.content,
            );
          }
        } catch (err) {
          this.logger.warn(
            `Failed to fetch latest published content for document ${id}: ${err?.message}`,
          );
        }
      }

      const pendingVersion = document.versions
        .filter((v) => v.status === DocumentStatus.PENDING)
        .sort((a, b) => b.versionNumber - a.versionNumber)[0];
      if (pendingVersion?.content) {
        const isDocx = pendingVersion.content.toLowerCase().endsWith(".docx");
        try {
          if (isDocx) {
            pendingVersionContentUrl = await this.s3Service.getSignedUrlForDownload(
              pendingVersion.content,
            );
          } else {
            pendingVersionContent = await this.s3Service.getFile(
              pendingVersion.content,
            );
          }
        } catch (err) {
          this.logger.warn(
            `Failed to fetch pending version content for document ${id}: ${err?.message}`,
          );
        }
      }
    }

    const {
      documentTemplate,
      processLinks: _processLinks,
      contentContributors,
      ...documentRest
    } = document;

    return {
      ...documentRest,
      documentTemplate: documentTemplate ? { id: documentTemplate.id } : null,
      latestPublishedVersionContent,
      latestPublishedVersionContentUrl,
      pendingVersionContent,
      pendingVersionContentUrl,
      versions: document.versions.map((version) => ({
        ...version,
        file: version.file,
      })),
      contributors: document.contributors.map((contributor) => ({
        ...contributor,
        version:
          contributor.documentVersion?.versionNumber ||
          document.versions?.[0]?.versionNumber ||
          document.currentVersion,
        actions: contributor.actions.map((action) => ({
          ...action,
          actionType: action.type,
          comment: action.comment,
        })),
      })),
      changeRequest:
        document.changeRequestDocuments.length > 0 &&
        document.changeRequestDocuments[
          document.changeRequestDocuments.length - 1
        ].changeRequest.status === ChangeRequestStatus.ACTIVE
          ? {
              id:
                document.changeRequestDocuments[
                  document.changeRequestDocuments.length - 1
                ].changeRequest.id,
            }
          : null,
      approvers,
      reviewers,
      acknowledgers,
      contentContributors: this.mapContentContributors(contentContributors),
      team: {
        id: document?.team?.id,
        name: document?.team?.name,
      },
    };
  }

  async getVersionContent(
    documentId: string,
    versionId: number,
    user: UserRequest,
  ): Promise<{ content: string | null; contentUrl?: string }> {
    const document = await this.getDocumentById(documentId, user);
    if (!document) {
      throw new NotFoundException(documentHttpError("DOC_007"));
    }
    if (document.contentType !== ContentType.EDITOR) {
      throw new BadRequestException(documentHttpError("DOC_009"));
    }
    const version = await this.versionRepo.findOne({
      where: {
        id: versionId,
        documentId,
      },
    });
    if (!version?.content) {
      throw new NotFoundException(documentHttpError("DOC_010"));
    }
    const isDocx = version.content.toLowerCase().endsWith(".docx");
    try {
      if (isDocx) {
        const contentUrl = await this.s3Service.getSignedUrlForDownload(
          version.content,
        );
        return { content: null, contentUrl };
      }
      const content = await this.s3Service.getFile(version.content);
      return { content };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.warn(`Failed to fetch version content: ${err?.message}`);
      throw new NotFoundException(documentHttpError("DOC_011", { cause: err }));
    }
  }

  async getDocumentVersions(
    paginationDto: PaginationDto,
    filterDto: DocumentFilterDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;
    const extraFilters = {
      ...(filterDto.search && {
        document: { title: Like(`%${filterDto.search}%`) },
      }),
      ...(filterDto.status && {
        document: { status: filterDto.status },
      }),
      ...(filterDto.category && {
        document: { documentType: { id: filterDto.category } },
      }),
      ...(filterDto.team && {
        document: { team: { id: filterDto.team } },
      }),
    };
    const where: any = { ...extraFilters };
    const [versions, total] = await this.versionRepo.findAndCount({
      where,
      skip,
      take: perPage,
      relations: [
        "document",
        "document.createdBy",
        "document.documentType",
        "document.team",
      ],
    });
    return {
      data: versions,
      currentPage: page,
      totalCount: total,
      perPage,
    };
  }

  async updateDocument(
    id: string,
    dto: UpdateDocumentDto,
    user: UserRequest,
  ): Promise<{ id: string; version: number }> {
    try {
      const { documentDraftId } = dto;

      if (documentDraftId) {
        const draft = await this.documentDraftRepository.findOne({
          where: { id: documentDraftId },
        });
        if (!draft) {
          throw new NotFoundException(documentHttpError("DOC_085"));
        }
        if (draft.documentId && draft.documentId !== id) {
          throw new BadRequestException(documentHttpError("DOC_084"));
        }
        if (draft.documentId) {
          await this.assertDocumentTeamAccessForDraft(draft.documentId, user);
        }
      }

      const document = await this.getDocumentById(id, user);

      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }

      const currentCategoryId = document.documentType?.id;
      if (currentCategoryId && dto.documentTypeId !== currentCategoryId) {
        const categoryStrategy = await this.getApprovalStrategyForCategory(
          currentCategoryId,
        );
        const strategyUsed =
          this.documentUsesCategoryApprovalStrategy(
            document,
            categoryStrategy,
          ) && this.hasApprovalWorkflowStarted(document);
        if (strategyUsed) {
          throw new BadRequestException(documentHttpError("DOC_092"));
        }
      }

      const documentType = await this.docTypeRepo.findOne({
        where: { id: dto.documentTypeId },
      });

      const team = await this.teamService.findById(dto.teamId as number);
      if (!team) {
        throw new NotFoundException(documentHttpError("DOC_003"));
      }

      if (dto.isPublic !== undefined) {
        document.isPublic = dto.isPublic;
      }
      if (dto.isAiAccessible !== undefined) {
        document.isAiAccessible = dto.isAiAccessible;
      }
      document.dueDate = dto.dueDate;

      document.updatedAt = new Date().valueOf();

      const categoryChanged = dto.documentTypeId !== document.documentType?.id;
      const teamChanged = dto.teamId !== document.team?.id;

      document.documentType = documentType;
      document.team = team;

      if (
        (categoryChanged || teamChanged) &&
        !this.hasApprovalWorkflowStarted(document)
      ) {
        document.approvalStrategy = await this.resolveApprovalStrategy(
          dto.documentTypeId as number,
          dto.teamId as number,
        );
        document.documentAcknowledgement = await this.resolveDocumentAcknowledgement(
          dto.documentTypeId as number,
          dto.teamId as number,
        );
      }

      if (dto.documentCode) {
        const existingDocCode = await this.documentRepository.findOne({
          where: {
            documentCode: dto.documentCode,
            team: { id: team.id },
            id: Not(id),
          },
        });
        if (existingDocCode) {
          throw new ConflictException(documentHttpError("DOC_005"));
        }
        document.documentCode = dto.documentCode;
      }
      document.title = dto.title;
      document.description = dto.description;
      await this.documentRepository.save(document);

      if (documentDraftId) {
        await this.deleteDocumentDraft(documentDraftId, user);
      }

      return { id: document.id, version: document.currentVersion };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_013", { cause: error }),
      );
    }
  }

  async deleteDocument(id: string, user: UserRequest): Promise<{ id: string }> {
    try {
      const document = await this.getDocumentById(id, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }

      document.deleted = true;
      document.documentCode = `${document.documentCode}-deleted-${Date.now()}`;
      await this.documentRepository.save(document);
      return { id: document.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_014", { cause: error }),
      );
    }
  }

  // Document Type Methods
  async getDocumentTypes(search?: string): Promise<DocumentType[]> {
    const qb = this.docTypeRepo
      .createQueryBuilder("docType")
      .leftJoinAndSelect("docType.createdBy", "creator")
      .where("docType.deleted = :deleted", { deleted: false })
      .select([
        "docType.id",
        "docType.name",
        "docType.description",
        "docType.categoryCode",
        "docType.createdAt",
        "docType.updatedAt",
        "creator.id",
        "creator.fname",
        "creator.lname",
      ])
      .loadRelationCountAndMap(
        "docType.documentsCount",
        "docType.documents",
        "docs",
        (qb) =>
          qb.andWhere("docs.deleted = :docsDeleted", { docsDeleted: false }),
      )
      .orderBy("docType.createdAt", "DESC");

    // Optional backend search by name or category code (case-insensitive)
    if (search) {
      qb.andWhere(
        "(LOWER(docType.name) LIKE :search OR LOWER(docType.categoryCode) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    return await qb.getMany();
  }
  async getDocumentTypeById(documentTypeId: number): Promise<DocumentType> {
    const documentType = await this.docTypeRepo.findOne({
      where: {
        id: documentTypeId,
        deleted: false,
      },
      relations: ["createdBy"],
      select: {
        id: true,
        name: true,
        description: true,
        categoryCode: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          id: true,
          fname: true,
          lname: true,
        },
      },
    });
    if (!documentType) {
      throw new NotFoundException(documentHttpError("DOC_074"));
    }
    return documentType;
  }

  async createDocumentType(
    documentTypeDTO: DocumentTypeDto,
    user: any,
  ): Promise<any> {
    const createdBy = await this.usersService.findBy({ id: user.id });
    try {
      // Check if document type with same name already exists
      const existingByName = await this.docTypeRepo.findOne({
        where: {
          name: documentTypeDTO.name,
          deleted: false,
        },
      });
      if (existingByName) {
        throw new ConflictException(documentHttpError("DOC_075"));
      }

      // Check if document type with same category code already exists
      const existingByCategoryCode = await this.docTypeRepo.findOne({
        where: {
          categoryCode: documentTypeDTO.categoryCode,
          deleted: false,
        },
      });
      if (existingByCategoryCode) {
        throw new BadRequestException(documentHttpError("DOC_015"));
      }

      const newDocumentType = this.docTypeRepo.create({
        ...documentTypeDTO,
        createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await this.docTypeRepo.save(newDocumentType);
      return { id: newDocumentType.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_016", { cause: error }),
      );
    }
  }

  async deleteDocumentType(documentTypeId: number): Promise<{ id: number }> {
    try {
      const documentType = await this.getDocumentTypeById(documentTypeId);

      const documents = await this.documentRepository.find({
        where: {
          documentType: { id: documentTypeId },
          deleted: false,
        },
      });
      if (documents.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_017"));
      }
      documentType.deleted = true;
      documentType.categoryCode = `${
        documentType.categoryCode
      }-deleted-${Date.now()}`;
      documentType.name = `${documentType.name}-deleted-${Date.now()}`;
      await this.docTypeRepo.save(documentType);
      return { id: documentType.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_018", { cause: error }),
      );
    }
  }

  async updateDocumentType(
    documentTypeId: number,
    documentTypeDTO: DocumentTypeDto,
  ): Promise<{ id: number }> {
    try {
      const documentType = await this.getDocumentTypeById(documentTypeId);

      // Check if document type with same name already exists (excluding current one)
      if (documentTypeDTO.name && documentTypeDTO.name !== documentType.name) {
        const existingByName = await this.docTypeRepo.findOne({
          where: {
            name: documentTypeDTO.name,
            deleted: false,
            id: Not(documentTypeId),
          },
        });
        if (existingByName) {
          throw new ConflictException(documentHttpError("DOC_075"));
        }
      }

      // Check if document type with same category code already exists (excluding current one)
      if (
        documentTypeDTO.categoryCode &&
        documentTypeDTO.categoryCode !== documentType.categoryCode
      ) {
        const existingByCategoryCode = await this.docTypeRepo.findOne({
          where: {
            categoryCode: documentTypeDTO.categoryCode,
            deleted: false,
            id: Not(documentTypeId),
          },
        });
        if (existingByCategoryCode) {
          throw new ConflictException(documentHttpError("DOC_015"));
        }
      }

      documentType.updatedAt = new Date().valueOf();
      Object.assign(documentType, documentTypeDTO);
      await this.docTypeRepo.save(documentType);
      return { id: documentType.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_076", { cause: error }),
      );
    }
  }

  private validateScopedAssignment(
    documentTypeId: number | undefined,
    teams: { id: number | string }[] | undefined,
    missingScopeErrorCode: DocumentErrorCode,
    conflictingScopeErrorCode: DocumentErrorCode,
  ): void {
    const hasCategory = !!documentTypeId;
    const hasTeams = !!teams?.length;

    if (!hasCategory && !hasTeams) {
      throw new BadRequestException(documentHttpError(missingScopeErrorCode));
    }
    if (hasCategory && hasTeams) {
      throw new BadRequestException(
        documentHttpError(conflictingScopeErrorCode),
      );
    }
  }

  private async checkForDuplicateCategoryScope(
    repo: Repository<ApprovalStrategy | DocumentAcknowledgement>,
    documentTypeId: number,
    duplicateScopeErrorCode: DocumentErrorCode,
    excludeEntityId?: number,
  ): Promise<void> {
    const existing = await repo.findOne({
      where: {
        deleted: false,
        documentType: { id: documentTypeId },
        id: excludeEntityId ? Not(excludeEntityId) : undefined,
      },
    });
    if (existing) {
      throw new BadRequestException(documentHttpError(duplicateScopeErrorCode));
    }
  }

  private validateCategoryMemberSelection(
    isCategoryScope: boolean,
    hasGlobalSelectionEnabled: boolean,
    invalidSelectionErrorCode: DocumentErrorCode,
  ): void {
    if (!isCategoryScope) {
      return;
    }
    if (hasGlobalSelectionEnabled) {
      throw new BadRequestException(
        documentHttpError(invalidSelectionErrorCode),
      );
    }
  }

  private async checkForOverlappingTeams(
    repo: Repository<ApprovalStrategy | DocumentAcknowledgement>,
    teams: Team[],
    overlappingTeamsErrorCode: DocumentErrorCode,
    excludeEntityId?: number,
  ): Promise<void> {
    const existingEntities = await repo.find({
      where: {
        deleted: false,
        documentType: IsNull(),
        id: excludeEntityId ? Not(excludeEntityId) : undefined,
      },
      relations: ["teams", "teams.team"],
    });

    const newTeamIds = [...new Set(teams.map((team) => team.id))];

    for (const entity of existingEntities) {
      const entityTeamIds = entity.teams.map((link) => link.team.id);
      for (const teamId of newTeamIds) {
        if (entityTeamIds.includes(teamId)) {
          throw new BadRequestException(
            documentHttpError(overlappingTeamsErrorCode),
          );
        }
      }
    }
  }

  async createApprovalStrategy(
    dto: CreateApprovalStrategyDto,
  ): Promise<{ id: number }> {
    try {
      if (!dto.documentTypeId) {
        throw new BadRequestException(documentHttpError("DOC_118"));
      }

      this.validateScopedAssignment(
        dto.documentTypeId,
        [],
        "DOC_088",
        "DOC_089",
      );

      this.validateCategoryMemberSelection(
        true,
        !!(dto.allApprovers || dto.allReviewers),
        "DOC_091",
      );

      const docType = await this.docTypeRepo.findOne({
        where: { id: dto.documentTypeId, deleted: false },
      });
      if (!docType) {
        throw new NotFoundException(documentHttpError("DOC_074"));
      }
      await this.checkForDuplicateCategoryScope(
        this.approvalStrategyRepo,
        dto.documentTypeId,
        "DOC_087",
      );

      const newStrategy = this.approvalStrategyRepo.create({
        maxApprovalDuration: dto.maxApprovalDuration,
        maxReviewDuration: dto.maxReviewDuration,
        requiredApprovals: dto.requiredApprovals,
        requiredReviews: dto.requiredReviews,
        allApprovers: false,
        allReviewers: false,
        allowOrdering: !!dto.allowOrdering,
        name: dto.name,
        noReview: dto.noReview,
        noApprove: dto.noApprove,
        isDefault: false,
        documentType: { id: dto.documentTypeId } as DocumentType,
      });

      newStrategy.teams = [];

      const approvers = dto.approvers.map(
        (approver) =>
          ({
            user: { id: approver.id } as User,
            roleType: "approver",
            order: this.memberOrder(approver.order),
          } as DocumentApprover),
      );

      const reviewers = dto.reviewers.map(
        (reviewer) =>
          ({
            user: { id: reviewer.id } as User,
            roleType: "reviewer",
            order: this.memberOrder(reviewer.order),
          } as DocumentApprover),
      );

      newStrategy.documentApprovers = [...approvers, ...reviewers];

      await this.approvalStrategyRepo.save(newStrategy);
      return { id: newStrategy.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_022", { cause: error }),
      );
    }
  }

  async getApprovalStrategies(user: UserRequest, search?: string) {
    try {
      await this.ensureDefaultApprovalStrategy();

      const unitIds = user.teamIds?.length > 0 ? user.teamIds : [-1];

      const qb = this.approvalStrategyRepo
        .createQueryBuilder("strategy")
        .leftJoinAndSelect("strategy.teams", "teams")
        .leftJoinAndSelect("teams.team", "team")
        .leftJoinAndSelect("strategy.documentType", "documentType")
        .where("strategy.deleted = :deleted", { deleted: false })
        .andWhere(
          new Brackets((subQb) => {
            subQb
              .where("strategy.document_type_id IS NOT NULL")
              .orWhere("strategy.is_default = :isDefault", { isDefault: true })
              .orWhere("team.id IN (:...unitIds)", { unitIds });
          }),
        );

      if (search) {
        qb.andWhere("LOWER(strategy.name) LIKE LOWER(:search)", {
          search: `%${search}%`,
        });
      }

      qb.orderBy("strategy.is_default", "DESC").addOrderBy(
        "strategy.name",
        "ASC",
      );

      const strategies = await qb.getMany();
      return strategies.map((strategy) => ({
        ...strategy,
        teams:
          strategy.teams?.map((entry) => entry.team).filter((team) => !!team) ??
          [],
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_023", { cause: error }),
      );
    }
  }
  async getApprovers(
    approvalStrategyId: number,
    teamId: number,
    user: UserRequest,
    documentId?: string,
  ) {
    const strategy = await this.approvalStrategyRepo.findOne({
      where: { id: approvalStrategyId, deleted: false },
      relations: [
        "documentApprovers",
        "documentApprovers.user",
        "teams",
        "teams.team",
        "documentType",
      ],
    });
    if (strategy?.noApprove) {
      return [];
    }
    if (strategy?.allApprovers) {
      return await this.permissionService.usersWithAccess(
        [teamId],
        user,
        DocumentPermission.subject,
      );
    }
    const entries =
      strategy?.documentApprovers.filter(
        (approver) => approver.roleType === "approver",
      ) ?? [];
    const users = await this.filterRoleUsersByTeamMembership(
      entries.map((approver) => approver.user),
      teamId,
    );
    if (!documentId || !strategy?.allowOrdering) {
      return users;
    }
    return this.usersWaitingAtCurrentOrder(
      users,
      entries,
      documentId,
      DocumentActionType.APPROVED,
    );
  }
  async getReviewers(
    approvalStrategyId: number,
    teamId: number,
    user: UserRequest,
    documentId?: string,
  ) {
    const strategy = await this.approvalStrategyRepo.findOne({
      where: { id: approvalStrategyId, deleted: false },
      relations: [
        "documentApprovers",
        "documentApprovers.user",
        "teams",
        "teams.team",
        "documentType",
      ],
    });
    if (strategy?.noReview) {
      return [];
    }
    if (strategy?.allReviewers) {
      return await this.permissionService.usersWithAccess(
        [teamId],
        user,
        DocumentPermission.subject,
      );
    }
    const entries =
      strategy?.documentApprovers.filter(
        (reviewer) => reviewer.roleType === "reviewer",
      ) ?? [];
    const users = await this.filterRoleUsersByTeamMembership(
      entries.map((reviewer) => reviewer.user),
      teamId,
    );
    if (!documentId || !strategy?.allowOrdering) {
      return users;
    }
    return this.usersWaitingAtCurrentOrder(
      users,
      entries,
      documentId,
      DocumentActionType.REVIEWED,
    );
  }

  private async filterRoleUsersByTeamMembership(
    users: User[],
    teamId: number,
  ): Promise<User[]> {
    if (!users?.length) {
      return [];
    }

    const userIds = Array.from(
      new Set(users.map((user) => user.id).filter(Boolean)),
    );
    if (!userIds.length) {
      return [];
    }

    const usersWithOrgAccess = await this.permissionService.usersWithAccess(
      [teamId],
      { id: "", username: "", teamIds: [] } as UserRequest,
      DocumentPermission.subject,
      false,
      userIds.join(","),
    );
    const validUserIds = new Set(usersWithOrgAccess.map((user) => user.id));

    return users.filter((user) => validUserIds.has(user.id));
  }

  async getApprovalStrategyById(
    id: number,
    user: UserRequest,
  ): Promise<ViewApprovalStrategyDto> {
    const strategy = await this.approvalStrategyRepo.findOne({
      where: { id },
      relations: [
        "teams",
        "documentApprovers",
        "documentApprovers.user",
        "teams.team",
        "documentType",
      ],
    });
    if (!strategy) {
      throw new NotFoundException(documentHttpError("DOC_024"));
    }
    return {
      ...strategy,
      documentTypeId: strategy.documentType?.id ?? undefined,
      isDefault: strategy.isDefault,
      teams: strategy.teams.map((strategyTeam) => strategyTeam.team),
      approvers: this.mapRoleUsersWithOrder(
        strategy.documentApprovers.filter(
          (approver) => approver.roleType === "approver",
        ),
        strategy.documentApprovers
          .filter((approver) => approver.roleType === "approver")
          .map((approver) => approver.user),
      ),
      reviewers: this.mapRoleUsersWithOrder(
        strategy.documentApprovers.filter(
          (reviewer) => reviewer.roleType === "reviewer",
        ),
        strategy.documentApprovers
          .filter((reviewer) => reviewer.roleType === "reviewer")
          .map((reviewer) => reviewer.user),
      ),
    };
  }

  async updateApprovalStrategy(
    id: number,
    dto: CreateApprovalStrategyDto,
    user: UserRequest,
  ): Promise<{ id: number }> {
    try {
      let strategy = await this.approvalStrategyRepo.findOne({
        where: { id },
        relations: [
          "teams",
          "teams.team",
          "documentApprovers",
          "documentApprovers.user",
          "documentType",
        ],
      });

      if (!strategy) {
        throw new NotFoundException(documentHttpError("DOC_024"));
      }

      const documentsWithVersions = await this.documentRepository.find({
        where: {
          approvalStrategy: { id },
          deleted: false,
        },
        relations: ["versions", "team"],
      });

      const inProgressDocuments = documentsWithVersions.filter((doc) => {
        const latestVersion = doc.versions.reduce(
          (max, version) =>
            version.versionNumber > max.versionNumber ? version : max,
          doc.versions[0],
        );
        return (
          latestVersion &&
          [DocumentStatus.PENDING, DocumentStatus.READY_FOR_APPROVAL].includes(
            latestVersion.status,
          )
        );
      });

      if (inProgressDocuments.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_025"));
      }

      const allDocuments = documentsWithVersions;
      const isDefaultStrategy = !!strategy.isDefault;
      const wasCategoryStrategy = !!strategy.documentType;

      if (isDefaultStrategy) {
        if (dto.documentTypeId) {
          throw new BadRequestException(documentHttpError("DOC_090"));
        }
        const firstTeam = await this.getFirstTeam();
        if (!firstTeam) {
          throw new BadRequestException(documentHttpError("DOC_088"));
        }
        strategy.teams = [
          {
            team: { id: firstTeam.id } as Team,
          } as ApprovalStrategyTeam,
        ];
        strategy.documentType = null;
      } else {
        this.validateScopedAssignment(
          dto.documentTypeId,
          dto.teams,
          "DOC_088",
          "DOC_089",
        );

        const isCategoryStrategy = !!dto.documentTypeId;

        if (wasCategoryStrategy !== isCategoryStrategy) {
          throw new BadRequestException(documentHttpError("DOC_090"));
        }

        this.validateCategoryMemberSelection(
          isCategoryStrategy,
          !!(dto.allApprovers || dto.allReviewers),
          "DOC_091",
        );

        if (!isCategoryStrategy) {
          // Team-scoped strategies: keep existing team-update rules.
          const currentTeamIds = strategy.teams
            .map((strategyTeam) => strategyTeam.team.id)
            .sort();
          const newTeamIds = dto.teams?.map((team) => team.id).sort() ?? [];

          if (allDocuments.length > 0) {
            const removedTeamIds = currentTeamIds.filter(
              (currentId) => !newTeamIds.includes(currentId),
            );

            if (removedTeamIds.length > 0) {
              const documentsInRemovedTeams = allDocuments.filter((doc) =>
                removedTeamIds.includes(doc.team.id),
              );

              if (documentsInRemovedTeams.length > 0) {
                throw new BadRequestException(documentHttpError("DOC_026"));
              }
            }
          }

          await this.checkForOverlappingTeams(
            this.approvalStrategyRepo,
            dto.teams?.map((team) => ({ id: team.id } as Team)) ?? [],
            "DOC_021",
            id,
          );
          strategy.teams =
            dto.teams?.map(
              (team) =>
                ({
                  team: { id: team.id } as Team,
                } as ApprovalStrategyTeam),
            ) ?? [];
          strategy.documentType = null;
        } else {
          const documentTypeId = dto.documentTypeId;
          if (documentTypeId == null) {
            throw new BadRequestException(documentHttpError("DOC_074"));
          }
          const docType = await this.docTypeRepo.findOne({
            where: {
              id: documentTypeId,
              deleted: false,
            },
          });
          if (!docType) {
            throw new NotFoundException(documentHttpError("DOC_074"));
          }
          await this.checkForDuplicateCategoryScope(
            this.approvalStrategyRepo,
            documentTypeId,
            "DOC_087",
            id,
          );
          strategy.teams = [];
          strategy.documentType = { id: documentTypeId } as DocumentType;
        }
      }

      const isCategoryStrategy = !!strategy.documentType;
      const existingApprovers = strategy.documentApprovers.filter(
        (approver) => approver.roleType === "approver",
      );
      const existingReviewers = strategy.documentApprovers.filter(
        (reviewer) => reviewer.roleType === "reviewer",
      );
      const approvers = dto.approvers.map((approver) => {
        const existing = existingApprovers.find(
          (a) => a.user.id === approver.id,
        );
        return {
          id: existing?.id || undefined,
          user: { id: approver.id } as User,
          roleType: "approver",
          order: this.memberOrder(approver.order ?? existing?.order),
          strategy: { id: strategy.id },
        } as DocumentApprover;
      });

      const reviewers = dto.reviewers.map((reviewer) => {
        const existing = existingReviewers.find(
          (r) => r.user.id === reviewer.id,
        );
        return {
          id: existing?.id || undefined,
          user: { id: reviewer.id } as User,
          roleType: "reviewer",
          order: this.memberOrder(reviewer.order ?? existing?.order),
          strategy: { id: strategy.id },
        } as DocumentApprover;
      });
      strategy.documentApprovers = [...approvers, ...reviewers];
      strategy.maxApprovalDuration =
        dto.maxApprovalDuration ?? strategy.maxApprovalDuration;
      strategy.maxReviewDuration =
        dto.maxReviewDuration ?? strategy.maxReviewDuration;
      strategy.requiredApprovals = dto.requiredApprovals;
      strategy.requiredReviews = dto.requiredReviews;
      strategy.allApprovers = isCategoryStrategy ? false : !!dto.allApprovers;
      strategy.allReviewers = isCategoryStrategy ? false : !!dto.allReviewers;
      strategy.allowOrdering = dto.allowOrdering ?? strategy.allowOrdering;
      strategy.name = dto.name;
      strategy.noReview = !!dto.noReview;
      strategy.noApprove = !!dto.noApprove;
      strategy.isDefault = isDefaultStrategy;

      await this.approvalStrategyRepo.save(strategy);
      return { id: strategy.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_028", { cause: error }),
      );
    }
  }

  async deleteApprovalStrategy(id: number): Promise<{ id: number }> {
    try {
      const strategy = await this.approvalStrategyRepo.findOne({
        where: { id },
      });
      if (!strategy) {
        throw new NotFoundException(documentHttpError("DOC_024"));
      }

      if (strategy.isDefault) {
        throw new BadRequestException(documentHttpError("DOC_119"));
      }

      const documents = await this.documentRepository.find({
        where: {
          approvalStrategy: { id },
          deleted: false,
        },
      });
      if (documents.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_029"));
      }

      await this.approvalStrategyRepo.save({
        ...strategy,
        deleted: true,
      });
      return { id: strategy.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_030", { cause: error }),
      );
    }
  }

  async createDocumentAcknowledgement(
    dto: CreateDocumentAcknowledgementDto,
  ): Promise<{ id: number }> {
    try {
      this.validateScopedAssignment(
        dto.documentTypeId,
        dto.teams,
        "DOC_106",
        "DOC_107",
      );

      const isCategoryAcknowledgement = !!dto.documentTypeId;
      this.validateCategoryMemberSelection(
        isCategoryAcknowledgement,
        !!dto.allUsers,
        "DOC_109",
      );

      if (isCategoryAcknowledgement) {
        const documentTypeId = dto.documentTypeId;
        if (documentTypeId == null) {
          throw new BadRequestException(documentHttpError("DOC_074"));
        }
        const docType = await this.docTypeRepo.findOne({
          where: { id: documentTypeId, deleted: false },
        });
        if (!docType) {
          throw new NotFoundException(documentHttpError("DOC_074"));
        }
        await this.checkForDuplicateCategoryScope(
          this.documentAcknowledgementRepo,
          documentTypeId,
          "DOC_105",
        );
      } else {
        await this.checkForOverlappingTeams(
          this.documentAcknowledgementRepo,
          dto.teams?.map((unit) => ({ id: unit.id } as Team)) ?? [],
          "DOC_021",
        );
      }

      const newAcknowledgement = this.documentAcknowledgementRepo.create({
        name: dto.name,
        description: dto.description,
        allUsers: isCategoryAcknowledgement ? false : dto.allUsers,
        documentType: isCategoryAcknowledgement
          ? ({ id: dto.documentTypeId } as DocumentType)
          : null,
      });

      newAcknowledgement.teams = isCategoryAcknowledgement
        ? []
        : dto.teams?.map(
            (unit) =>
              ({
                team: { id: unit.id } as Team,
              } as DocumentAcknowledgementUnit),
          ) ?? [];

      newAcknowledgement.acknowledgementUsers = (dto.users ?? []).map(
        (user) =>
          ({
            user: { id: user.id } as User,
          } as DocumentAcknowledgementUser),
      );

      await this.documentAcknowledgementRepo.save(newAcknowledgement);
      return { id: newAcknowledgement.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_096", { cause: error }),
      );
    }
  }

  async getDocumentAcknowledgements(user: UserRequest, search?: string) {
    try {
      const qb = this.documentAcknowledgementRepo
        .createQueryBuilder("acknowledgement")
        .leftJoinAndSelect("acknowledgement.teams", "teams")
        .leftJoinAndSelect("teams.team", "team")
        .leftJoinAndSelect("acknowledgement.documentType", "documentType")
        .where("acknowledgement.deleted = :deleted", { deleted: false })
        .andWhere(
          new Brackets((subQb) => {
            subQb
              .where("acknowledgement.document_type_id IS NOT NULL")
              .orWhere("team.id IN (:...unitIds)", {
                unitIds: user.teamIds,
              });
          }),
        );

      if (search) {
        qb.andWhere("LOWER(acknowledgement.name) LIKE LOWER(:search)", {
          search: `%${search}%`,
        });
      }

      const acknowledgements = await qb.getMany();
      return acknowledgements.map((acknowledgement) => ({
        ...acknowledgement,
        teams:
          acknowledgement.teams
            ?.map((entry) => entry.team)
            .filter((unit) => !!unit) ?? [],
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_097", { cause: error }),
      );
    }
  }

  async getDocumentAcknowledgementById(
    id: number,
    user: UserRequest,
  ): Promise<ViewDocumentAcknowledgementDto> {
    const acknowledgement = await this.documentAcknowledgementRepo.findOne({
      where: { id },
      relations: [
        "teams",
        "teams.team",
        "acknowledgementUsers",
        "acknowledgementUsers.user",
        "documentType",
      ],
    });

    if (!acknowledgement) {
      throw new NotFoundException(documentHttpError("DOC_098"));
    }

    return {
      ...acknowledgement,
      documentTypeId: acknowledgement.documentType?.id ?? undefined,
      teams: acknowledgement.teams.map((unit) => unit.team),
      users: acknowledgement.acknowledgementUsers.map((entry) => ({
        id: entry.user.id,
        fname: entry.user.fname,
        lname: entry.user.lname,
        email: entry.user.email,
      })),
    };
  }

  async updateDocumentAcknowledgement(
    id: number,
    dto: CreateDocumentAcknowledgementDto,
    user: UserRequest,
  ): Promise<{ id: number }> {
    try {
      let acknowledgement = await this.documentAcknowledgementRepo.findOne({
        where: { id },
        relations: [
          "teams",
          "teams.team",
          "acknowledgementUsers",
          "acknowledgementUsers.user",
          "documentType",
        ],
      });

      if (!acknowledgement) {
        throw new NotFoundException(documentHttpError("DOC_098"));
      }

      const documentsWithVersions = await this.documentRepository.find({
        where: {
          documentAcknowledgement: { id },
          deleted: false,
        },
        relations: ["versions", "team"],
      });

      const inProgressDocuments = documentsWithVersions.filter((doc) => {
        const latestVersion = doc.versions.reduce(
          (max, version) =>
            version.versionNumber > max.versionNumber ? version : max,
          doc.versions[0],
        );
        return (
          latestVersion &&
          [DocumentStatus.PENDING, DocumentStatus.READY_FOR_APPROVAL].includes(
            latestVersion.status,
          )
        );
      });

      if (inProgressDocuments.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_099"));
      }

      this.validateScopedAssignment(
        dto.documentTypeId,
        dto.teams,
        "DOC_106",
        "DOC_107",
      );

      const isCategoryAcknowledgement = !!dto.documentTypeId;
      const wasCategoryAcknowledgement = !!acknowledgement.documentType;

      if (wasCategoryAcknowledgement !== isCategoryAcknowledgement) {
        throw new BadRequestException(documentHttpError("DOC_108"));
      }

      this.validateCategoryMemberSelection(
        isCategoryAcknowledgement,
        !!dto.allUsers,
        "DOC_109",
      );

      if (!isCategoryAcknowledgement) {
        const currentUnitIds = acknowledgement.teams
          .map((ou) => ou.team.id)
          .sort();
        const newUnitIds = dto.teams?.map((unit) => unit.id).sort() ?? [];

        if (documentsWithVersions.length > 0) {
          const removedUnitIds = currentUnitIds.filter(
            (currentId) => !newUnitIds.includes(currentId),
          );

          if (removedUnitIds.length > 0) {
            const documentsInRemovedOUs = documentsWithVersions.filter((doc) =>
              removedUnitIds.includes(doc.team.id),
            );

            if (documentsInRemovedOUs.length > 0) {
              throw new BadRequestException(documentHttpError("DOC_100"));
            }
          }
        }

        await this.checkForOverlappingTeams(
          this.documentAcknowledgementRepo,
          dto.teams?.map((unit) => ({ id: unit.id } as Team)) ?? [],
          "DOC_021",
          id,
        );
        acknowledgement.teams =
          dto.teams?.map(
            (unit) =>
              ({
                team: { id: unit.id } as Team,
              } as DocumentAcknowledgementUnit),
          ) ?? [];
        acknowledgement.documentType = null;
      } else {
        const documentTypeId = dto.documentTypeId;
        if (documentTypeId == null) {
          throw new BadRequestException(documentHttpError("DOC_074"));
        }
        const docType = await this.docTypeRepo.findOne({
          where: {
            id: documentTypeId,
            deleted: false,
          },
        });
        if (!docType) {
          throw new NotFoundException(documentHttpError("DOC_074"));
        }
        await this.checkForDuplicateCategoryScope(
          this.documentAcknowledgementRepo,
          documentTypeId,
          "DOC_105",
          id,
        );
        acknowledgement.teams = [];
        acknowledgement.documentType = {
          id: documentTypeId,
        } as DocumentType;
      }

      const existingUsers = acknowledgement.acknowledgementUsers;
      acknowledgement.acknowledgementUsers = (dto.users ?? []).map(
        (userRef) =>
          ({
            id:
              existingUsers.find((entry) => entry.user.id === userRef.id)?.id ||
              undefined,
            user: { id: userRef.id } as User,
            acknowledgement: { id: acknowledgement.id },
          } as DocumentAcknowledgementUser),
      );

      acknowledgement.name = dto.name;
      acknowledgement.description =
        dto.description ?? acknowledgement.description;
      acknowledgement.allUsers = isCategoryAcknowledgement
        ? false
        : !!dto.allUsers;

      await this.documentAcknowledgementRepo.save(acknowledgement);
      return { id: acknowledgement.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_102", { cause: error }),
      );
    }
  }

  async deleteDocumentAcknowledgement(id: number): Promise<{ id: number }> {
    try {
      const acknowledgement = await this.documentAcknowledgementRepo.findOne({
        where: { id },
      });
      if (!acknowledgement) {
        throw new NotFoundException(documentHttpError("DOC_098"));
      }

      const documents = await this.documentRepository.find({
        where: {
          documentAcknowledgement: { id },
          deleted: false,
        },
      });
      if (documents.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_103"));
      }

      await this.documentAcknowledgementRepo.save({
        ...acknowledgement,
        deleted: true,
      });
      return { id: acknowledgement.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_104", { cause: error }),
      );
    }
  }

  async createDocumentAction(
    actionDto: CreateDocumentActionDto,
    documentId: string,
    user: any,
  ): Promise<{ id: number }> {
    try {
      // First check if the document exists
      const document = await this.getDocumentById(documentId, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }
      const {
        approvers,
        reviewers,
      } = await this.resolveDocumentReviewParticipants(document, user);
      // Check if user has permission to perform this action
      let userContributor =
        approvers.some((approver) => approver.id === user.id) ||
        reviewers.some((reviewer) => reviewer.id === user.id);

      if (
        !userContributor &&
        [
          DocumentActionType.APPROVED,
          DocumentActionType.REJECTED,
          DocumentActionType.REVIEWED,
          DocumentActionType.REVIEWED_REJECTED,
        ].includes(actionDto.type)
      ) {
        throw new BadRequestException(documentHttpError("DOC_031"));
      }

      // Validate action type based on user role
      if (
        actionDto.type === DocumentActionType.APPROVED ||
        actionDto.type === DocumentActionType.REJECTED
      ) {
        const isApprover = approvers.some(
          (approver) => approver.id === user.id,
        );

        if (!isApprover) {
          throw new BadRequestException(documentHttpError("DOC_032"));
        }
      }

      if (
        actionDto.type === DocumentActionType.REVIEWED ||
        actionDto.type === DocumentActionType.REVIEWED_REJECTED
      ) {
        const isReviewer = reviewers.some(
          (reviewer) => reviewer.id === user.id,
        );

        if (!isReviewer) {
          throw new BadRequestException(documentHttpError("DOC_033"));
        }
      }

      let docVersion: DocumentVersion;
      if (actionDto.type === DocumentActionType.ACKNOWLEDGED) {
        const acknowledgers = await this.getAcknowledgersForDocument(
          document,
          user,
        );
        if (
          !acknowledgers.some((acknowledger) => acknowledger.id === user.id)
        ) {
          throw new BadRequestException(documentHttpError("DOC_110"));
        }

        const latestVersionNumber = document.versions.reduce(
          (max, version) =>
            version.versionNumber > max ? version.versionNumber : max,
          document.currentVersion ?? 0,
        );
        const targetVersionNumber =
          actionDto.versionNumber ?? latestVersionNumber;
        if (targetVersionNumber !== latestVersionNumber) {
          throw new BadRequestException(documentHttpError("DOC_111"));
        }

        const targetVersion = document.versions.find(
          (version) => version.versionNumber === targetVersionNumber,
        );
        if (
          !targetVersion ||
          ![DocumentStatus.PUBLISHED, DocumentStatus.OBSOLETE].includes(
            targetVersion.status,
          )
        ) {
          throw new BadRequestException(documentHttpError("DOC_112"));
        }

        docVersion = targetVersion;
      } else {
        docVersion = document.versions.reduce((max, version) =>
          version.versionNumber > max.versionNumber ? version : max,
        );
      }

      if (
        [
          DocumentActionType.REVIEWED,
          DocumentActionType.REVIEWED_REJECTED,
        ].includes(actionDto.type)
      ) {
        this.assertOrderedRoleCanAct(
          document,
          user.id,
          docVersion.id,
          "reviewer",
          new Set(reviewers.map((reviewer) => reviewer.id)),
        );
      }

      if (
        [DocumentActionType.APPROVED, DocumentActionType.REJECTED].includes(
          actionDto.type,
        )
      ) {
        this.assertOrderedRoleCanAct(
          document,
          user.id,
          docVersion.id,
          "approver",
          new Set(approvers.map((approver) => approver.id)),
        );
      }

      // Find existing contributor with the correct type
      const existingContributor = await this.documentContributorRepository.findOne(
        {
          where: {
            user: { id: user.id },
            document: { id: documentId.toString() },
            documentVersionId: docVersion.id,
          },
          relations: ["actions"],
        },
      );

      let contributor = existingContributor;
      if (!existingContributor) {
        const newContributor = this.documentContributorRepository.create({
          user: { id: user.id },
          document: document,
          documentVersion: docVersion,
        });
        contributor = await this.documentContributorRepository.save(
          newContributor,
        );
      }

      if (!contributor) {
        throw new BadRequestException(documentHttpError("DOC_036"));
      }

      if (
        [
          DocumentActionType.REVIEWED,
          DocumentActionType.REVIEWED_REJECTED,
          DocumentActionType.APPROVED,
          DocumentActionType.REJECTED,
        ].includes(actionDto.type)
      ) {
        // Find the opposite action type
        const oppositeType = this.getActionOppositeType(actionDto.type);

        const oppositeAction = await this.documentActionRepository.findOne({
          where: {
            documentContributor: {
              id: contributor.id,
            },
            type: oppositeType,
          },
        });
        if (oppositeAction) {
          // Update document status
          oppositeAction.type = actionDto.type;
          await this.documentActionRepository.save(oppositeAction);
          if (actionDto.type === DocumentActionType.APPROVED) {
            this.enqueueDocumentAiIndex(document.id, docVersion.id);
          }
          return {
            id: oppositeAction.id,
          };
        } else {
          const existingAction = await this.documentActionRepository.findOne({
            where: {
              documentContributor: {
                id: contributor.id,
              },
              type: actionDto.type,
            },
          });
          if (existingAction) {
            return {
              id: existingAction.id,
            };
          }
        }
      }

      if (actionDto.type === DocumentActionType.ACKNOWLEDGED) {
        const existingAction = await this.documentActionRepository.findOne({
          where: {
            documentContributor: {
              id: contributor.id,
            },
            type: DocumentActionType.ACKNOWLEDGED,
          },
        });
        if (existingAction) {
          return {
            id: existingAction.id,
          };
        }
      }

      // Create the new action
      const action = this.documentActionRepository.create({
        type: actionDto.type,
        documentContributor: contributor,
        createdDate: Date.now(),
      });

      if (actionDto.comment) {
        action.comment = {
          text: actionDto.comment,
          creator: user,
        } as Comment;
      }

      const savedAction = await this.documentActionRepository.save(action);

      if (actionDto.type === DocumentActionType.APPROVED) {
        this.enqueueDocumentAiIndex(document.id, docVersion.id);
      }

      if (
        actionDto.type === DocumentActionType.READY_FOR_APPROVAL &&
        docVersion.status == DocumentStatus.PENDING
      ) {
        if (
          document.approvalStrategy.requiredReviews >
          document.contributors.filter((c) =>
            c.actions.some((a) => a.type === DocumentActionType.REVIEWED),
          ).length
        ) {
          throw new BadRequestException(documentHttpError("DOC_034"));
        }
        await this.updateCurrentVersionStatus(
          docVersion,
          document.approvalStrategy.noApprove
            ? DocumentStatus.PUBLISHED
            : DocumentStatus.READY_FOR_APPROVAL,
        );
      } else if (
        actionDto.type === DocumentActionType.PUBLISHED &&
        docVersion.status == DocumentStatus.READY_FOR_APPROVAL
      ) {
        if (
          document.approvalStrategy.requiredApprovals >
          document.contributors.filter((c) =>
            c.actions.some((a) => a.type === DocumentActionType.APPROVED),
          ).length
        ) {
          throw new BadRequestException(documentHttpError("DOC_035"));
        }
        await this.updateCurrentVersionStatus(
          docVersion,
          DocumentStatus.PUBLISHED,
        );
      } else if (
        actionDto.type === DocumentActionType.SEND_FOR_REVIEW &&
        docVersion.status == DocumentStatus.READY_FOR_APPROVAL
      ) {
        await this.updateCurrentVersionStatus(
          docVersion,
          DocumentStatus.PENDING,
        );
        const previousActions = await this.documentActionRepository.find({
          where: {
            documentContributor: { document: { id: documentId.toString() } },
            type: In([
              DocumentActionType.REVIEWED,
              DocumentActionType.REVIEWED_REJECTED,
            ]),
          },
        });
        await this.documentActionRepository.remove(previousActions);
      }

      return {
        id: savedAction.id,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_036", { cause: error }),
      );
    }
  }

  private memberOrder(order?: number | null): number {
    return typeof order === "number" && Number.isInteger(order) && order > 0
      ? order
      : 1;
  }

  private mapRoleUsersWithOrder(
    entries: DocumentApprover[],
    users: User[],
  ): Array<{
    id: string;
    fname: string;
    lname: string;
    email: string;
    order: number;
  }> {
    const orderByUserId = new Map(
      entries
        .filter((entry) => entry.user?.id)
        .map((entry) => [entry.user.id, this.memberOrder(entry.order)]),
    );
    return [...users]
      .map((roleUser) => ({
        id: roleUser.id,
        fname: roleUser.fname,
        lname: roleUser.lname,
        email: roleUser.email,
        order: orderByUserId.get(roleUser.id) ?? 1,
      }))
      .sort((left, right) => left.order - right.order);
  }

  private orderingApplies(
    strategy: ApprovalStrategy | null | undefined,
    roleType: "approver" | "reviewer",
  ): boolean {
    if (!strategy?.allowOrdering) {
      return false;
    }
    if (roleType === "reviewer" && strategy.allReviewers) {
      return false;
    }
    if (roleType === "approver" && strategy.allApprovers) {
      return false;
    }
    return true;
  }

  private completedUserIdsOnVersion(
    document: {
      contributors?: Array<{
        documentVersionId?: number;
        documentVersion?: { id: number };
        user?: { id: string };
        actions?: Array<{ type: DocumentActionType }>;
      }>;
    },
    versionId: number,
    actionType: DocumentActionType,
  ): Set<string> {
    const completed = new Set<string>();
    for (const contributor of document.contributors || []) {
      const onVersion =
        contributor.documentVersionId === versionId ||
        contributor.documentVersion?.id === versionId;
      if (!onVersion || !contributor.user?.id) {
        continue;
      }
      if (contributor.actions?.some((action) => action.type === actionType)) {
        completed.add(contributor.user.id);
      }
    }
    return completed;
  }

  private assertOrderedRoleCanAct(
    document: Document,
    userId: string,
    versionId: number,
    roleType: "approver" | "reviewer",
    eligibleUserIds: Set<string>,
  ): void {
    const strategy = document.approvalStrategy;
    if (!this.orderingApplies(strategy, roleType)) {
      return;
    }

    const members = (strategy.documentApprovers || [])
      .filter(
        (entry) =>
          entry.roleType === roleType &&
          entry.user?.id &&
          eligibleUserIds.has(entry.user.id),
      )
      .map((entry) => ({
        id: entry.user.id,
        order: this.memberOrder(entry.order),
      }));
    const actor = members.find((member) => member.id === userId);
    if (!actor) {
      return;
    }

    const completed = this.completedUserIdsOnVersion(
      document,
      versionId,
      roleType === "reviewer"
        ? DocumentActionType.REVIEWED
        : DocumentActionType.APPROVED,
    );
    const blockedByEarlierOrder = members.some(
      (member) => member.order < actor.order && !completed.has(member.id),
    );
    if (blockedByEarlierOrder) {
      throw new BadRequestException(
        documentHttpError(roleType === "reviewer" ? "DOC_122" : "DOC_123"),
      );
    }
  }

  private async usersWaitingAtCurrentOrder(
    users: User[],
    entries: DocumentApprover[],
    documentId: string,
    completedAction: DocumentActionType,
  ): Promise<User[]> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: [
        "versions",
        "contributors",
        "contributors.user",
        "contributors.actions",
      ],
    });
    const latestVersion = document?.versions?.reduce((max, version) =>
      version.versionNumber > max.versionNumber ? version : max,
    );
    if (!document || !latestVersion) {
      return users;
    }

    const members = entries
      .filter(
        (entry) =>
          entry.user?.id && users.some((user) => user.id === entry.user.id),
      )
      .map((entry) => ({
        id: entry.user.id,
        order: this.memberOrder(entry.order),
      }));
    const completed = this.completedUserIdsOnVersion(
      document,
      latestVersion.id,
      completedAction,
    );
    const pending = members.filter((member) => !completed.has(member.id));
    if (!pending.length) {
      return [];
    }
    const currentOrder = Math.min(...pending.map((member) => member.order));
    const currentIds = new Set(
      pending
        .filter((member) => member.order === currentOrder)
        .map((member) => member.id),
    );
    return users.filter((user) => currentIds.has(user.id));
  }

  private async participantsUnlockedByAction(
    document: Document,
    actorId: string | undefined,
    roleType: "approver" | "reviewer",
  ): Promise<User[]> {
    if (
      !actorId ||
      !this.orderingApplies(document.approvalStrategy, roleType)
    ) {
      return [];
    }
    const latestVersion = document.versions?.reduce((max, version) =>
      version.versionNumber > max.versionNumber ? version : max,
    );
    if (!latestVersion) {
      return [];
    }

    const entries = (document.approvalStrategy.documentApprovers || []).filter(
      (entry) => entry.roleType === roleType && entry.user?.id,
    );
    const validUsers = await this.filterRoleUsersByTeamMembership(
      entries.map((entry) => entry.user),
      document.team.id,
    );
    const validIds = new Set(validUsers.map((roleUser) => roleUser.id));
    const members = entries
      .filter((entry) => validIds.has(entry.user.id))
      .map((entry) => ({
        user: entry.user,
        order: this.memberOrder(entry.order),
      }));
    const actor = members.find((member) => member.user.id === actorId);
    if (!actor) {
      return [];
    }
    const completed = this.completedUserIdsOnVersion(
      document,
      latestVersion.id,
      roleType === "reviewer"
        ? DocumentActionType.REVIEWED
        : DocumentActionType.APPROVED,
    );
    const pending = members.filter((member) => !completed.has(member.user.id));
    if (!pending.length) {
      return [];
    }
    const currentOrder = Math.min(...pending.map((member) => member.order));
    if (currentOrder <= actor.order) {
      return [];
    }
    return pending
      .filter((member) => member.order === currentOrder)
      .map((member) => member.user);
  }

  private getActionOppositeType(type: DocumentActionType): DocumentActionType {
    return type === DocumentActionType.REVIEWED
      ? DocumentActionType.REVIEWED_REJECTED
      : type === DocumentActionType.REVIEWED_REJECTED
      ? DocumentActionType.REVIEWED
      : type === DocumentActionType.APPROVED
      ? DocumentActionType.REJECTED
      : type === DocumentActionType.REJECTED
      ? DocumentActionType.APPROVED
      : type;
  }

  async getDocumentActions(user: any): Promise<any> {
    try {
      const actions = await this.documentActionRepository.find({
        relations: [
          "documentContributor",
          "documentContributor.document",
          "documentContributor.user",
        ],
        order: { id: "DESC" },
      });
      return {
        success: true,
        message: "Document actions fetched successfully",
        data: actions,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getDocumentAction(id: number, user: any): Promise<any> {
    try {
      const action = await this.documentActionRepository.findOne({
        where: {
          id,
        },
        relations: [
          "documentContributor",
          "documentContributor.document",
          "documentContributor.user",
        ],
      });

      if (!action) {
        throw new NotFoundException(documentHttpError("DOC_037"));
      }

      return {
        success: true,
        message: "Document action fetched successfully",
        data: action,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_038", { cause: error }),
      );
    }
  }

  async deleteDocumentAction(
    documentId: string,
    actionId: string,
    user: any,
  ): Promise<any> {
    try {
      const action = await this.documentActionRepository.findOne({
        where: {
          id: Number(actionId),
        },
        relations: [
          "documentContributor",
          "documentContributor.document",
          "documentContributor.user",
          "comment",
        ],
      });

      if (!action) {
        throw new NotFoundException(documentHttpError("DOC_039"));
      }

      // Check if the current user is the one who created the comment
      if (action.documentContributor.user.id !== user.id) {
        throw new BadRequestException(documentHttpError("DOC_040"));
      }

      // Check if this is a comment action
      if (action.type !== DocumentActionType.COMMENTED) {
        throw new BadRequestException(documentHttpError("DOC_041"));
      }

      // Verify the action belongs to the correct document
      if (action.documentContributor.document.id !== documentId) {
        throw new BadRequestException(documentHttpError("DOC_042"));
      }

      await this.documentActionRepository.remove(action);

      return {
        success: true,
        message: "Comment deleted successfully",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_043", { cause: error }),
      );
    }
  }

  async overrideApprove(id: string, user: UserRequest) {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ["versions", "team", "contributors"],
    });
    if (!document) {
      throw new NotFoundException(documentHttpError("DOC_007"));
    }

    // Get the latest version
    const latestVersion = document.versions.reduce((max, version) =>
      version.versionNumber > max.versionNumber ? version : max,
    );

    // Find the contributor for this version
    let contributor = document.contributors.find(
      (c) => c.documentVersionId === latestVersion.id,
    );

    if (!contributor) {
      contributor = this.documentContributorRepository.create({
        user: { id: user.id },
        document: document,
        documentVersion: latestVersion,
      });
      contributor = await this.documentContributorRepository.save(contributor);
    }

    if (contributor) {
      // Create a MARKED_OBSOLETE action for the contributor
      const action = this.documentActionRepository.create({
        type: DocumentActionType.OVERRIDE_APPROVED,
        documentContributor: contributor,
        createdDate: Date.now(),
      });

      await this.documentActionRepository.save(action);
    }

    await this.updateCurrentVersionStatus(
      latestVersion,
      DocumentStatus.PUBLISHED,
    );

    return {
      success: true,
      message: "Document marked as obsolete successfully",
    };
  }

  async markObsolete(id: string, user: UserRequest) {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ["versions", "team", "contributors"],
    });
    if (!document) {
      throw new NotFoundException(documentHttpError("DOC_007"));
    }

    // Get the latest version
    const latestVersion = document.versions.reduce((max, version) =>
      version.versionNumber > max.versionNumber ? version : max,
    );

    // Find the contributor for this version
    let contributor = document.contributors.find(
      (c) => c.documentVersionId === latestVersion.id,
    );
    if (!contributor) {
      contributor = this.documentContributorRepository.create({
        user: { id: user.id },
        document: document,
        documentVersion: latestVersion,
      });
      contributor = await this.documentContributorRepository.save(contributor);
    }

    if (contributor) {
      // Create a MARKED_OBSOLETE action for the contributor
      const action = this.documentActionRepository.create({
        type: DocumentActionType.MARKED_OBSOLETE,
        documentContributor: contributor,
        createdDate: Date.now(),
      });

      await this.documentActionRepository.save(action);
    }

    await this.expireDocumentVersions(document, {
      includeNewerThanCurrent: true,
    });

    return {
      success: true,
      message: "Document marked as obsolete successfully",
    };
  }

  private recipientsFor(
    users: Array<User | null | undefined>,
    message: string,
    actorId?: string,
  ): NotificationRecipient[] {
    const seen = new Set<string>();
    const recipients: NotificationRecipient[] = [];
    if (!message) {
      return recipients;
    }
    for (const user of users) {
      if (!user?.id || !user.email || user.id === actorId || seen.has(user.id)) {
        continue;
      }
      seen.add(user.id);
      recipients.push({ user, message });
    }
    return recipients;
  }

  private notificationResult(
    route: string,
    recipients: NotificationRecipient[],
  ): NotificationInfoResponse {
    return { skip: recipients.length === 0, route, recipients };
  }

  async getNotificationInfo(
    data: NotificationInfoParam,
  ): Promise<NotificationInfoResponse> {
    const { subject, method, entityId, userId } = data;
    const none = (): NotificationInfoResponse =>
      this.notificationResult("", []);
    switch (subject) {
      case "document_types":
        return none();
      case "documents":
        let directMessage = "";
        if (method === "createDocumentAction") {
          const action = await this.documentActionRepository.findOne({
            where: {
              id: Number(entityId),
            },
            relations: [
              "documentContributor",
              "documentContributor.user",
              "documentContributor.document",
              "documentContributor.document.createdBy",
              "documentContributor.document.team",
              "documentContributor.document.documentType",
              "documentContributor.document.contributors",
              "documentContributor.document.contributors.user",
              "documentContributor.document.contributors.actions",
              "documentContributor.document.documentAcknowledgement",
              "documentContributor.document.documentAcknowledgement.acknowledgementUsers",
              "documentContributor.document.documentAcknowledgement.acknowledgementUsers.user",
              "documentContributor.document.approvalStrategy",
              "documentContributor.document.approvalStrategy.documentApprovers",
              "documentContributor.document.approvalStrategy.documentApprovers.user",
              "documentContributor.document.versions",
            ],
          });
          if (!action) {
            return none();
          }
          const message = this.mapActionTypeToMessage(action.type);
          if (!message) {
            return none();
          }
          const status = action.documentContributor.document.versions.reduce(
            (max, version) =>
              version.versionNumber > max.versionNumber ? version : max,
          )?.status;
          const document = action.documentContributor.document;
          const docOrgId = document.team.id;
          let users: Array<{
            id: string;
            fname: string;
            lname: string;
            email: string;
          }> = [];
          if (
            action.type === DocumentActionType.SEND_FOR_REVIEW &&
            status === DocumentStatus.PENDING
          ) {
            users = await this.getReviewers(
              document.approvalStrategy.id,
              docOrgId,
              {
                id: "",
                username: "",
                teamIds: [],
              } as UserRequest,
              document.id,
            );
            directMessage = "A document is waiting for your review";
          } else if (
            action.type === DocumentActionType.READY_FOR_APPROVAL &&
            status === DocumentStatus.READY_FOR_APPROVAL
          ) {
            users = await this.getApprovers(
              document.approvalStrategy.id,
              docOrgId,
              {
                id: "",
                username: "",
                teamIds: [],
              } as UserRequest,
              document.id,
            );
            directMessage = "A document is waiting for your approval";
          } else if (
            action.type === DocumentActionType.REVIEWED &&
            status === DocumentStatus.PENDING
          ) {
            users = await this.participantsUnlockedByAction(
              document,
              action.documentContributor.user?.id,
              "reviewer",
            );
            if (users.length) {
              directMessage = "A document is waiting for your review";
            }
          } else if (
            action.type === DocumentActionType.APPROVED &&
            status === DocumentStatus.READY_FOR_APPROVAL
          ) {
            users = await this.participantsUnlockedByAction(
              document,
              action.documentContributor.user?.id,
              "approver",
            );
            if (users.length) {
              directMessage = "A document is waiting for your approval";
            }
          } else if (
            action.type === DocumentActionType.PUBLISHED &&
            status === DocumentStatus.PUBLISHED
          ) {
            users = await this.getAcknowledgersForDocument(document, {
              id: "",
              username: "",
              teamIds: [],
            } as UserRequest);
            directMessage = "A document is waiting for your acknowledgement";
          }

          const recipients = this.recipientsFor(
            (directMessage ? users : [...users, document.createdBy]) as User[],
            directMessage || message,
            userId,
          );
          if (directMessage) {
            recipients.push(
              ...this.recipientsFor([document.createdBy], message, userId).filter(
                (recipient) =>
                  !recipients.some((existing) => existing.user.id === recipient.user.id),
              ),
            );
          }
          return this.notificationResult(document.id, recipients);
        }
        if (method == "overrideApprove") {
          const document = await this.documentRepository.findOne({
            where: { id: String(entityId) },
            relations: [
              "createdBy",
              "team",
              "approvalStrategy",
              "approvalStrategy.documentApprovers",
              "approvalStrategy.documentApprovers.user",
            ],
          });
          if (!document) {
            return none();
          }

          let documentUsers: User[] = [];
          if (document.approvalStrategy) {
            documentUsers = document.approvalStrategy.documentApprovers.map(
              (approver) => approver.user,
            );
          }
          return this.notificationResult(
            document.id,
            this.recipientsFor(
              [...documentUsers, document.createdBy],
              "has overridden approval and approved the document",
              userId,
            ),
          );
        }
        if (method == "markObsolete") {
          const document = await this.documentRepository.findOne({
            where: { id: String(entityId) },
            relations: [
              "team",
              "approvalStrategy",
              "approvalStrategy.documentApprovers",
              "approvalStrategy.documentApprovers.user",
              "versions",
            ],
          });
          if (!document) {
            return none();
          }

          return this.notificationResult(
            document.id,
            this.recipientsFor(
              [document.createdBy],
              "has marked the document as obsolete",
              userId,
            ),
          );
        }
        if (
          method == "createNewVersion" ||
          method == "uploadVersionFile" ||
          method == "uploadVersionEditorContent" ||
          method == "uploadVersionChecklist"
        ) {
          const document = await this.documentRepository.findOne({
            where: { id: String(entityId) },
            relations: [
              "team",
              "documentType",
              "documentAcknowledgement",
              "documentAcknowledgement.acknowledgementUsers",
              "documentAcknowledgement.acknowledgementUsers.user",
              "approvalStrategy",
              "approvalStrategy.documentApprovers",
              "approvalStrategy.documentApprovers.user",
              "versions",
            ],
          });
          if (!document) {
            return none();
          }
          const status = document.versions.reduce((max, version) =>
            version.versionNumber > max.versionNumber ? version : max,
          )?.status;
          let documentUsers: User[] = [];
          let directMessage = "";
          const documentOrgId = document.team.id;
          const actionMessage = this.mapDocumentVersionMethodMessage(method);
          if (status === DocumentStatus.PENDING) {
            documentUsers = await this.getReviewers(
              document.approvalStrategy.id,
              documentOrgId,
              { id: "", username: "", teamIds: [] } as UserRequest,
              document.id,
            );
            directMessage = "A document is waiting for your review";
          } else if (status === DocumentStatus.READY_FOR_APPROVAL) {
            documentUsers = await this.getApprovers(
              document.approvalStrategy.id,
              documentOrgId,
              { id: "", username: "", teamIds: [] } as UserRequest,
              document.id,
            );
            directMessage = "A document is waiting for your approval";
          }
          return this.notificationResult(
            document.id,
            this.recipientsFor(
              documentUsers,
              directMessage || actionMessage,
              userId,
            ),
          );
        }
        if (method == "saveVersionReviewComments") {
          const document = await this.documentRepository.findOne({
            where: { id: String(entityId) },
            relations: [
              "team",
              "approvalStrategy",
              "approvalStrategy.documentApprovers",
              "approvalStrategy.documentApprovers.user",
              "createdBy",
            ],
          });
          if (!document) {
            return none();
          }
          const documentOrgId = document.team.id;
          const reviewers = await this.getReviewers(
            document.approvalStrategy.id,
            documentOrgId,
            { id: "", username: "", teamIds: [] } as UserRequest,
          );
          const approvers =
            document.approvalStrategy?.documentApprovers?.map(
              (approver) => approver.user,
            ) ?? [];
          return this.notificationResult(
            document.id,
            this.recipientsFor(
              [document.createdBy, ...approvers, ...reviewers],
              "has saved review comments on the document",
              userId,
            ),
          );
        }

        const document = await this.documentRepository.findOne({
          where: { id: String(entityId) },
          relations: [
            "team",
            "approvalStrategy",
            "approvalStrategy.documentApprovers",
            "approvalStrategy.documentApprovers.user",
            "versions",
          ],
        });
        if (!document) {
          return none();
        }
        const documentOrgId = document.team.id;
        let documentUsers: User[] = [];
        const status = document.versions.reduce((max, version) =>
          version.versionNumber > max.versionNumber ? version : max,
        )?.status;
        if (status === DocumentStatus.PENDING) {
          documentUsers = await this.getReviewers(
            document.approvalStrategy.id,
            documentOrgId,
            { id: "", username: "", teamIds: [] } as UserRequest,
            document.id,
          );
          directMessage = "A document is waiting for your review";
        } else if (status === DocumentStatus.READY_FOR_APPROVAL) {
          documentUsers = await this.getApprovers(
            document.approvalStrategy.id,
            documentOrgId,
            { id: "", username: "", teamIds: [] } as UserRequest,
            document.id,
          );
          directMessage = "A document is waiting for your approval";
        }
        return this.notificationResult(
          document.id,
          this.recipientsFor(documentUsers, directMessage, userId),
        );

      case "approval_strategies":
        return none();
      case "change_requests":
        const changeRequest = await this.changeRequestRepository.findOne({
          where: { id: Number(entityId) },
          relations: [
            "documents",
            "team",
            "documents.document",
            "documents.document.approvalStrategy",
            "documents.document.approvalStrategy.documentApprovers",
            "documents.document.createdBy",
            "requestedBy",
          ],
        });
        if (!changeRequest) {
          return none();
        }

        return this.notificationResult(
          String(changeRequest.id),
          this.recipientsFor(
            [
              changeRequest.requestedBy,
              ...changeRequest.documents.map((d) => d.document.createdBy),
            ],
            this.mapChangeRequestStatusToMessage(changeRequest.status),
            userId,
          ),
        );
      case "document_templates":
        return none();

      default:
        return none();
    }
  }

  private mapChangeRequestStatusToMessage(status: ChangeRequestStatus): string {
    switch (status) {
      case ChangeRequestStatus.ACTIVE:
        return "has requested changes to a document";
      case ChangeRequestStatus.ACCEPTED:
        return "has approved a change request and now documents need to be modified";
      case ChangeRequestStatus.REJECTED:
        return "has rejected a change request";
    }
  }

  private mapActionTypeToMessage(actionType: DocumentActionType): string {
    switch (actionType) {
      case DocumentActionType.PUBLISHED:
        return "published a document";
      case DocumentActionType.APPROVED:
        return "approved a document";
      case DocumentActionType.REJECTED:
        return "rejected a document";
      case DocumentActionType.REVIEWED:
        return "reviewed a document";
      case DocumentActionType.REVIEWED_REJECTED:
        return "requested changes to a document";
      case DocumentActionType.READY_FOR_APPROVAL:
        return "marked a document as ready for approval";
      case DocumentActionType.SEND_FOR_REVIEW:
        return "sent a document for review";
      default:
        return "";
    }
  }

  private mapDocumentVersionMethodMessage(method: string): string {
    switch (method) {
      case "createNewVersion":
        return "has created a new document version";
      case "uploadVersionFile":
      case "uploadVersionEditorContent":
      case "uploadVersionChecklist":
        return "has updated a document version";
      default:
        return "";
    }
  }

  private translateDocumentVersionStatus(
    status: DocumentStatus,
    lang: string,
  ): string {
    const key = `documents.versionStatus.${status}`;
    const translated = this.i18n.translate(key, { lang });
    return translated !== key ? (translated as string) : String(status);
  }

  private async notifyDraftCreatorsPurged(
    drafts: DocumentDraft[],
    version: DocumentVersion,
    newStatus: DocumentStatus,
  ): Promise<void> {
    if (!drafts.length) {
      return;
    }

    const document =
      drafts[0].document ??
      (await this.documentRepository.findOne({
        where: { id: version.documentId },
      }));

    const creatorIds = drafts
      .map((d) => d.createdBy?.id)
      .filter((id): id is string => !!id);
    const localeMap = await this.usersService.findLocalesByIds(creatorIds);
    const notifiedUserIds = new Set<string>();

    for (const draft of drafts) {
      const creator = draft.createdBy;
      if (!creator?.id || !creator.email || notifiedUserIds.has(creator.id)) {
        continue;
      }
      notifiedUserIds.add(creator.id);

      const lang = localeMap[creator.id] || "en";
      const documentTitle =
        document?.title ??
        (this.i18n.translate("documents.draftPurged.documentTitleFallback", {
          lang,
        }) as string);
      const statusLabel = this.translateDocumentVersionStatus(newStatus, lang);
      const message = this.i18n.translate(
        "documents.draftPurged.emailMessage",
        {
          lang,
          args: {
            draftTitle: draft.title,
            documentTitle,
            versionNumber: version.versionNumber,
            statusLabel,
          },
        },
      ) as string;
      const subject = this.i18n.translate(
        "documents.draftPurged.emailSubject",
        { lang },
      ) as string;

      try {
        this.queuePublisher.sendEmail({
          to: creator.email,
          type: EmailType.NOTIFICATION,
          subject,
          replaceString: {
            name:
              `${creator.fname ?? ""} ${creator.lname ?? ""}`.trim() || "User",
            message,
            link: document
              ? `/plan/documents/${document.id}/edit`
              : "/plan/documents/drafts",
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to queue draft purge email for user ${creator.id}: ${error?.message}`,
        );
      }
    }
  }

  private async purgeDraftsLinkedToVersion(
    version: DocumentVersion,
    newStatus: DocumentStatus,
  ): Promise<void> {
    if (version.status !== DocumentStatus.PENDING) {
      return;
    }
    if (newStatus === DocumentStatus.PENDING) {
      return;
    }

    const drafts = await this.documentDraftRepository.find({
      where: {
        documentVersionId: version.id,
      },
      relations: ["createdBy", "document"],
    });

    if (!drafts.length) {
      return;
    }

    await this.notifyDraftCreatorsPurged(drafts, version, newStatus);

    for (const draft of drafts) {
      if (draft.content) {
        try {
          await this.s3Service.deleteFile(draft.content);
        } catch (error) {
          this.logger.warn(
            `Failed to delete draft content from storage: ${error?.message}`,
          );
        }
      }
      await this.documentDraftRepository.remove(draft);
    }
  }

  private async updateCurrentVersionStatus(
    version: DocumentVersion,
    status: DocumentStatus,
  ) {
    if (version.status !== status) {
      await this.purgeDraftsLinkedToVersion(version, status);
      version.status = status;
      await this.versionRepo.save(version);
      if (
        [DocumentStatus.OBSOLETE, DocumentStatus.PUBLISHED].includes(status)
      ) {
        const document = await this.documentRepository.findOne({
          where: { id: version.documentId },
        });
        if (!document) {
          throw new NotFoundException(documentHttpError("DOC_007"));
        }
        document.currentVersion = version.versionNumber;
        await this.documentRepository.save(document);
        if (status === DocumentStatus.PUBLISHED) {
          await this.obsoleteVersionsBefore(
            version.documentId,
            version.versionNumber,
          );
        }
      }
      if (status === DocumentStatus.PUBLISHED) {
        this.enqueueDocumentAiIndex(version.documentId, version.id);
      }
    }
  }

  private enqueueDocumentAiIndex(documentId: string, versionId: number): void {
    this.queuePublisher
      .indexDocumentForAi({ documentId, versionId })
      .catch((error) => {
        this.logger.warn(
          `Failed to enqueue document AI index for ${documentId} v${versionId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      });
  }

  // Change Request Methods
  async createChangeRequest(
    dto: CreateChangeRequestDto,
    user: UserRequest,
  ): Promise<{ id: number }> {
    try {
      if (dto.teamId == null) {
        throw new BadRequestException(documentHttpError("DOC_044"));
      }
      // Check if user has access to the document's team
      const hasAccess = await this.permissionService.usersWithAccess(
        [dto.teamId],
        user,
        DocumentPermission.subject,
        false,
        user.id,
      );

      if (!hasAccess.length) {
        throw new NotFoundException(documentHttpError("DOC_044"));
      }
      // Check if some of the documents already have a change request, or if they have an unpublished version

      // Check for existing active change requests on the documents
      const existingChangeRequests = await this.changeRequestRepository
        .createQueryBuilder("cr")
        .leftJoinAndSelect("cr.documents", "cr_docs")
        .leftJoinAndSelect("cr_docs.document", "document")
        .where("cr.status = :activeStatus", {
          activeStatus: ChangeRequestStatus.ACTIVE,
        })
        .andWhere("cr_docs.documentId IN (:...docIds)", {
          docIds: dto.documentIds,
        })
        .getMany();

      if (existingChangeRequests && existingChangeRequests.length > 0) {
        const titleList = existingChangeRequests.flatMap((cr) =>
          cr.documents.map((cd) => cd.document.title),
        );
        const titlesStr = titleList.join(", ");
        if (titleList.length === 1) {
          throw new BadRequestException(
            documentHttpError("DOC_045", { params: { title: titleList[0] } }),
          );
        }
        throw new BadRequestException(
          documentHttpError("DOC_046", { params: { titles: titlesStr } }),
        );
      }

      // Check for unpublished versions in the selected documents
      const unpublishedDocs = await this.documentRepository
        .createQueryBuilder("d")
        .leftJoinAndSelect("d.versions", "v")
        .where("d.id IN (:...docIds)", { docIds: dto.documentIds })
        .andWhere("v.status NOT IN (:...publishedStatuses)", {
          publishedStatuses: [
            DocumentStatus.PUBLISHED,
            DocumentStatus.OBSOLETE,
          ],
        })
        .getMany();

      if (unpublishedDocs && unpublishedDocs.length > 0) {
        const unpublishedTitles = unpublishedDocs.map((d) => d.title);
        const titlesStr = unpublishedTitles.join(", ");
        if (unpublishedTitles.length === 1) {
          throw new BadRequestException(
            documentHttpError("DOC_047", {
              params: { title: unpublishedTitles[0] },
            }),
          );
        }
        throw new BadRequestException(
          documentHttpError("DOC_048", { params: { titles: titlesStr } }),
        );
      }

      const existingCount = await this.changeRequestRepository.count({
        where: {},
      });
      const autoTitle = `CR-${existingCount + 1}`;

      const changeRequest = this.changeRequestRepository.create({
        ...dto,
        title: autoTitle,
        status: ChangeRequestStatus.ACTIVE,
        requestedBy: { id: user.id },
        documents: dto.documentIds.map((documentId) => ({
          document: { id: documentId },
        })),
        createdAt: new Date().valueOf(),
        updatedAt: new Date().valueOf(),
      });
      const savedChangeRequest = await this.changeRequestRepository.save(
        changeRequest,
      );
      return { id: savedChangeRequest.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_049", { cause: error }),
      );
    }
  }

  async getChangeRequests(
    user: UserRequest,
    paginationDto: PaginationDto,
    filterDto: ChangeRequestFilterDto,
  ): Promise<PaginatedResponse<ChangeRequestDto>> {
    const { page = 1, perPage = 10 } = paginationDto;
    const skip = (page - 1) * perPage;

    const queryBuilder = this.changeRequestRepository
      .createQueryBuilder("cr")
      .leftJoinAndSelect("cr.documents", "documents")
      .leftJoinAndSelect("documents.document", "document")
      .leftJoinAndSelect("cr.team", "team")
      .leftJoinAndSelect("cr.requestedBy", "requestedBy")
      .leftJoinAndSelect("cr.reviewedBy", "reviewedBy");

    if (filterDto.status) {
      queryBuilder.andWhere("cr.status = :status", {
        status: filterDto.status,
      });
    }

    // Apply filters
    if (filterDto.search) {
      queryBuilder.andWhere(
        "LOWER(cr.title) LIKE LOWER(:search) OR LOWER(cr.reason) LIKE LOWER(:search)",
        { search: `%${filterDto.search}%` },
      );
    }

    // Check user permissions for teams
    const { teamIds } = await this.permissionService.hasPermissions(
      user,
      DocumentPermission.subject,
      ["read"],
    );
    if (teamIds.length > 0) {
      queryBuilder.andWhere("cr.team.id IN (:...teamIds)", {
        teamIds,
      });
    }

    const [changeRequests, total] = await queryBuilder
      .skip(skip)
      .take(perPage)
      .orderBy("cr.createdAt", "DESC")
      .getManyAndCount();

    const changeRequestDtos = changeRequests.map((cr) => ({
      id: cr.id,
      title: cr.title,
      reason: cr.reason,
      status: cr.status,
      documentIds: cr.documents.map((d) => d.document.id),
      requestedBy: {
        id: cr.requestedBy.id,
        fname: cr.requestedBy.fname,
        lname: cr.requestedBy.lname,
        email: cr.requestedBy.email,
      },
      reviewedBy: cr.reviewedBy
        ? {
            id: cr.reviewedBy.id,
            fname: cr.reviewedBy.fname,
            lname: cr.reviewedBy.lname,
            email: cr.reviewedBy.email,
          }
        : undefined,
      reviewedAt: cr.reviewedAt,
      reviewComment: cr.reviewComment,
      createdAt: cr.createdAt,
      updatedAt: cr.updatedAt,
    }));

    return {
      data: changeRequestDtos,
      currentPage: page,
      totalCount: total,
      perPage,
    };
  }

  async getChangeRequestById(
    id: number,
    user: UserRequest,
  ): Promise<ViewChangeRequestDto> {
    const changeRequest = await this.changeRequestRepository.findOne({
      where: { id },
      relations: [
        "documents",
        "documents.document",
        "team",
        "requestedBy",
        "reviewedBy",
      ],
    });

    if (!changeRequest) {
      throw new NotFoundException(documentHttpError("DOC_050"));
    }

    return {
      id: changeRequest.id,
      reason: changeRequest.reason,
      justification: changeRequest.justification,
      riskIdentified: changeRequest.risks,
      status: changeRequest.status,
      documentIds: changeRequest.documents.map((d) => d.document.id),
      documents: changeRequest.documents.map((d) => ({
        id: d.document.id,
        title: d.document.title,
      })),
      team: changeRequest.team
        ? {
            id: changeRequest.team.id,
            name: changeRequest.team.name,
          }
        : undefined,
      requestedBy: {
        id: changeRequest.requestedBy.id,
        fname: changeRequest.requestedBy.fname,
        lname: changeRequest.requestedBy.lname,
        email: changeRequest.requestedBy.email,
      },
      reviewedBy: changeRequest.reviewedBy
        ? {
            id: changeRequest.reviewedBy.id,
            fname: changeRequest.reviewedBy.fname,
            lname: changeRequest.reviewedBy.lname,
            email: changeRequest.reviewedBy.email,
          }
        : undefined,
      reviewedAt: changeRequest.reviewedAt,
      reviewComment: changeRequest.reviewComment,
      createdAt: changeRequest.createdAt,
      updatedAt: changeRequest.updatedAt,
    };
  }

  async updateChangeRequest(
    id: number,
    dto: UpdateChangeRequestDto,
    user: UserRequest,
  ): Promise<ChangeRequest> {
    try {
      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
        relations: [
          "documents",
          "documents.document",
          "documents.document.team",
        ],
      });

      if (!changeRequest) {
        throw new NotFoundException(documentHttpError("DOC_050"));
      }

      // Only the requester can update their own change request
      if (changeRequest.requestedById !== user.id) {
        throw new NotFoundException(documentHttpError("DOC_051"));
      }

      // Cannot update if already reviewed
      if (changeRequest.status !== ChangeRequestStatus.ACTIVE) {
        throw new BadRequestException(documentHttpError("DOC_052"));
      }
      // Check if user has access to the document's team
      const hasAccess = await this.permissionService.usersWithAccess(
        [changeRequest.team.id],
        user,
        DocumentPermission.subject,
        false,
        user.id,
      );

      if (!hasAccess.length) {
        throw new NotFoundException(documentHttpError("DOC_044"));
      }

      Object.assign(changeRequest, dto);
      return await this.changeRequestRepository.save(changeRequest);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_080", { cause: error }),
      );
    }
  }

  async reviewChangeRequest(
    id: number,
    dto: ReviewChangeRequestDto,
    user: UserRequest,
  ): Promise<ChangeRequest> {
    try {
      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
        relations: [
          "documents",
          "documents.document",
          "documents.document.team",
        ],
      });

      if (!changeRequest) {
        throw new NotFoundException(documentHttpError("DOC_050"));
      }

      // Cannot review if already reviewed
      if (changeRequest.status !== ChangeRequestStatus.ACTIVE) {
        throw new BadRequestException(documentHttpError("DOC_054"));
      }

      // Update change request
      changeRequest.status = dto.status;
      changeRequest.reviewedBy = { id: user.id } as User;
      changeRequest.reviewedAt = new Date().valueOf();
      changeRequest.reviewComment =
        dto.reviewComment ?? changeRequest.reviewComment;

      // If accepted, create an empty PENDING version per document (workflow status is set when file/editor/checklist content is uploaded)
      if (dto.status === ChangeRequestStatus.ACCEPTED) {
        for (const crDoc of changeRequest.documents) {
          const document = crDoc.document;
          const isEditorOrChecklist =
            document.contentType === ContentType.EDITOR ||
            document.contentType === ContentType.CHECKLIST;
          const documentVersion = this.versionRepo.create({
            versionNumber: document.currentVersion + 1,
            document: document,
            content: isEditorOrChecklist ? "" : document.description || "",
            createdAt: new Date().valueOf(),
            createdBy: { id: user.id } as User,
            file: "",
            changes: "",
            reasonForChange: changeRequest.reason,
            changeRequest: changeRequest,
            changeRequestId: changeRequest.id,
            status: DocumentStatus.PENDING,
          });

          await this.versionRepo.save(documentVersion);
        }
      }

      return await this.changeRequestRepository.save(changeRequest);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_081", { cause: error }),
      );
    }
  }

  async deleteChangeRequest(id: number, user: UserRequest): Promise<void> {
    try {
      const changeRequest = await this.changeRequestRepository.findOne({
        where: { id },
        relations: ["team"],
      });

      if (!changeRequest) {
        throw new NotFoundException(documentHttpError("DOC_050"));
      }

      // Only the requester can delete their own change request
      if (changeRequest.requestedById !== user.id) {
        throw new NotFoundException(documentHttpError("DOC_055"));
      }

      // Cannot delete if already reviewed
      if (changeRequest.status !== ChangeRequestStatus.ACTIVE) {
        throw new BadRequestException(documentHttpError("DOC_056"));
      }

      // Check if user has access to the document's team
      const hasAccess = await this.permissionService.usersWithAccess(
        [changeRequest.team.id],
        user,
        DocumentPermission.subject,
        false,
        user.id,
      );

      if (!hasAccess.length) {
        throw new NotFoundException(documentHttpError("DOC_044"));
      }

      await this.changeRequestRepository.remove(changeRequest);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_082", { cause: error }),
      );
    }
  }

  async findAllManagementReviewData(
    dataStartDate: number,
    dataEndDate: number,
    page: number,
    perPage: number,
  ): Promise<{ data: DataReviewDto[]; totalCount: number }> {
    const skip = (page - 1) * perPage;

    // Build the query to get documents with their current version
    const queryBuilder = this.documentRepository
      .createQueryBuilder("document")
      .leftJoinAndSelect("document.createdBy", "createdBy")
      .leftJoinAndSelect(
        "document.versions",
        "version",
        "version.versionNumber = document.currentVersion",
      )
      .where("document.createdAt BETWEEN :dataStartDate AND :dataEndDate", {
        dataStartDate,
        dataEndDate,
      })
      .andWhere("document.deleted = :deleted", { deleted: false })
      .orderBy("document.createdAt", "DESC")
      .skip(skip)
      .take(perPage);

    const [documents, totalCount] = await queryBuilder.getManyAndCount();

    const data = documents.map((document) => ({
      id: document.id,
      name: document.title || "",
      description: document.description || "",
      status: document.versions?.[0]?.status || "",
      createdAt: document.createdAt || 0,
      createdBy: {
        id: document.createdBy?.id,
        fname: document.createdBy?.fname,
        lname: document.createdBy?.lname,
        email: document.createdBy?.email,
      } as User,
      updatedAt: document.updatedAt || 0,
    }));

    return { data, totalCount };
  }

  private assertCanEditDocumentContent(
    document: Document,
    user: UserRequest,
  ): void {
    if (!userCanEditDocumentContent(user.id, document)) {
      throw new BadRequestException(documentHttpError("DOC_126"));
    }
  }

  private mapContentContributors(
    rows: DocumentContentContributor[] | undefined,
  ) {
    return (rows ?? [])
      .flatMap((row) => {
        const person = row.user;
        if (!person?.id) {
          return [];
        }
        return [
          {
            id: person.id,
            fname: person.fname,
            lname: person.lname,
            email: person.email,
          },
        ];
      })
      .sort((a, b) =>
        `${a.fname} ${a.lname}`.localeCompare(`${b.fname} ${b.lname}`),
      );
  }

  private async assertDocumentOwner(
    documentId: string,
    user: UserRequest,
  ): Promise<Document> {
    const document = await this.getDocumentById(documentId, user);
    if (document.createdBy?.id !== user.id) {
      throw new BadRequestException(documentHttpError("DOC_125"));
    }
    return document;
  }

  async addContentContributors(
    documentId: string,
    userIds: string[],
    user: UserRequest,
  ) {
    const document = await this.assertDocumentOwner(documentId, user);
    const eligible = await this.permissionService.usersWithAccess(
      [document.team.id],
      { id: "", username: "", teamIds: [] } as UserRequest,
      DocumentPermission.subject,
      false,
      userIds.join(","),
      [{ subject: DocumentPermission.subject, action: "update" }],
    );
    const plan = planContentContributorAdd({
      ownerId: document.createdBy?.id,
      existingIds: (document.contentContributors ?? [])
        .map((row) => row.user?.id)
        .filter((id): id is string => !!id),
      requestedIds: userIds,
      eligibleIds: eligible.map((person) => person.id),
    });
    if (!plan.ok) {
      throw new BadRequestException(
        documentHttpError(plan.reason === "includes_owner" ? "DOC_128" : "DOC_127"),
      );
    }

    for (const userId of plan.userIds) {
      try {
        await this.contentContributorRepo.save(
          this.contentContributorRepo.create({
            documentId: document.id,
            userId,
          }),
        );
      } catch (error) {
        if (!this.isDuplicateKey(error)) {
          throw error;
        }
      }
    }

    return this.listContentContributors(document.id);
  }

  async removeContentContributor(
    documentId: string,
    contributorUserId: string,
    user: UserRequest,
  ) {
    const document = await this.assertDocumentOwner(documentId, user);
    const row = await this.contentContributorRepo.findOne({
      where: { documentId: document.id, userId: contributorUserId },
    });
    if (!row) {
      throw new NotFoundException(documentHttpError("DOC_129"));
    }
    await this.contentContributorRepo.remove(row);
    return this.listContentContributors(document.id);
  }

  private async listContentContributors(documentId: string) {
    const rows = await this.contentContributorRepo.find({
      where: { documentId },
      relations: ["user"],
    });
    return this.mapContentContributors(rows);
  }

  private isDuplicateKey(error: unknown): boolean {
    const driverError = (error as { driverError?: { code?: string }; code?: string })
      ?.driverError;
    const code =
      driverError?.code ?? (error as { code?: string })?.code;
    return code === "ER_DUP_ENTRY";
  }

  async createNewVersion(
    documentId: string,
    dto: CreateDocumentVersionDto,
    user: UserRequest,
    file?: any,
  ) {
    const { documentDraftId, checklist: checklistInput, ...dtoBody } = dto;

    if (documentDraftId) {
      const draft = await this.documentDraftRepository.findOne({
        where: { id: documentDraftId },
      });
      if (!draft) {
        throw new NotFoundException(documentHttpError("DOC_085"));
      }
      if (draft.documentId !== documentId) {
        throw new BadRequestException(documentHttpError("DOC_084"));
      }
      if (draft.documentVersionId != null) {
        throw new BadRequestException(documentHttpError("DOC_084"));
      }
      await this.assertDocumentTeamAccessForDraft(documentId, user);
    }

    const queryRunner = this.documentRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const document = await this.getDocumentById(documentId, user);

      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }

      this.assertCanEditDocumentContent(document, user);

      if (!document.approvalStrategy) {
        throw new BadRequestException(documentHttpError("DOC_008"));
      }

      const isEditorDoc = document.contentType === ContentType.EDITOR;
      const isChecklistDoc = document.contentType === ContentType.CHECKLIST;
      const checklistDto = this.resolveChecklistDto(
        document.contentType,
        checklistInput,
        true,
      );

      if (!isChecklistDoc && !file) {
        throw new BadRequestException(documentHttpError("DOC_001"));
      }

      document.updatedAt = new Date().valueOf();
      const docVersion = document.versions.reduce((max, version) =>
        version.versionNumber > max.versionNumber ? version : max,
      );

      if (
        ![DocumentStatus.PUBLISHED, DocumentStatus.OBSOLETE].includes(
          docVersion.status,
        )
      ) {
        throw new BadRequestException(documentHttpError("DOC_058"));
      }
      if (
        document.changeRequestDocuments.some(
          (d) => d.changeRequest.status === ChangeRequestStatus.ACTIVE,
        )
      ) {
        throw new BadRequestException(documentHttpError("DOC_059"));
      }
      const approvalStrategy = document.approvalStrategy;

      const version = this.versionRepo.create({
        document,
        versionNumber: document.currentVersion + 1,
        content: document.description,
        createdAt: new Date().valueOf(),
        file: "",
        changes: dtoBody.changes || null,
        createdBy: { id: user.id },
        status: await this.resolveInitialWorkflowStatus(
          approvalStrategy,
          document.team.id,
          user,
        ),
      });

      await queryRunner.manager.save(version);

      if (isChecklistDoc) {
        version.checklist = this.createChecklist(checklistDto!);
      } else {
        const fileUrl = await this.s3Service.uploadFile(file);
        if (isEditorDoc) {
          version.content = fileUrl;
        } else {
          version.file = fileUrl;
        }
      }

      await queryRunner.manager.save(version);

      if (version.status === DocumentStatus.PUBLISHED) {
        await queryRunner.manager.update(
          Document,
          { id: document.id },
          { currentVersion: version.versionNumber },
        );
        const prior = document.versions.filter(
          (existing) =>
            existing.versionNumber < version.versionNumber &&
            existing.status !== DocumentStatus.OBSOLETE,
        );
        for (const existing of prior) {
          await this.purgeDraftsLinkedToVersion(
            existing,
            DocumentStatus.OBSOLETE,
          );
          existing.status = DocumentStatus.OBSOLETE;
        }
        if (prior.length) {
          await queryRunner.manager.save(prior);
        }
      }

      if (dto.dueDate !== undefined) {
        await queryRunner.manager.update(
          Document,
          { id: document.id },
          { dueDate: dto.dueDate || 0 },
        );
      }

      await queryRunner.commitTransaction();

      if (documentDraftId) {
        await this.deleteDocumentDraft(documentDraftId, user);
      }

      return { id: document.id, version: version.versionNumber };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        "Error creating new document version",
        error?.stack || error,
      );
      throw new BadRequestException(
        documentHttpError("DOC_060", { cause: error }),
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
    const template = await this.documentTemplateRepository.findOne({
      where: { id, deleted: false },
      relations: ["createdBy"],
    });
    if (!template) {
      throw new NotFoundException(documentHttpError("DOC_006"));
    }
    try {
      template.content = await this.s3Service.getSignedUrlForDownload(
        template.content,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to fetch template content from storage: ${error.message}`,
      );
    }
    return template;
  }

  async createDocumentTemplate(
    dto: CreateDocumentTemplateDto,
    user: UserRequest,
    file?: any,
  ): Promise<{ id: string }> {
    try {
      const existing = await this.documentTemplateRepository.findOne({
        where: { title: dto.title, deleted: false },
      });
      if (existing) {
        throw new ConflictException(documentHttpError("DOC_061"));
      }

      const contentUrl = await this.s3Service.uploadFile(file);

      const template = this.documentTemplateRepository.create({
        ...dto,
        content: contentUrl,
        createdBy: { id: user.id },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await this.documentTemplateRepository.save(template);
      return { id: template.id };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_062", { cause: error }),
      );
    }
  }

  async updateDocumentTemplate(
    id: string,
    dto: CreateDocumentTemplateDto,
    user: UserRequest,
    file?: any,
  ): Promise<{ id: string }> {
    try {
      const template = await this.documentTemplateRepository.findOne({
        where: { id, deleted: false },
        relations: ["createdBy"],
      });
      if (!template) {
        throw new NotFoundException(documentHttpError("DOC_006"));
      }

      if (template.isDefault) {
        throw new BadRequestException(documentHttpError("DOC_063"));
      }

      if (dto.title && dto.title !== template.title) {
        const existing = await this.documentTemplateRepository.findOne({
          where: { title: dto.title, deleted: false },
        });
        if (existing) {
          throw new BadRequestException(documentHttpError("DOC_061"));
        }
      }

      // Upload new file if provided
      if (file) {
        // Delete the old file from storage first
        if (template.content && template.content.includes("/")) {
          await this.s3Service.deleteFile(template.content);
        }
        template.content = await this.s3Service.uploadFile(file);
      }

      Object.assign(template, {
        title: dto.title ?? template.title,
        description: dto.description ?? template.description,
        updatedAt: Date.now(),
      });

      await this.documentTemplateRepository.save(template);
      return { id: template.id };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_064", { cause: error }),
      );
    }
  }

  async uploadVersionFile(
    documentId: string,
    versionId: number,
    user: UserRequest,
    file?: any,
    changes?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException(documentHttpError("DOC_065"));
      }

      // Get the document and verify access
      const document = await this.getDocumentById(documentId, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }

      this.assertCanEditDocumentContent(document, user);

      if (document.contentType === ContentType.CHECKLIST) {
        throw new BadRequestException(documentHttpError("DOC_117"));
      }

      // Get the specific version
      const version = await this.versionRepo.findOne({
        where: {
          id: versionId,
          document: { id: documentId },
          status: DocumentStatus.PENDING,
        },
        relations: ["document"],
      });

      if (!version) {
        throw new NotFoundException(documentHttpError("DOC_066"));
      }

      // Delete old file from storage if it exists (for file replacement)
      if (version.file) {
        try {
          await this.s3Service.deleteFile(version.file);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old file from storage: ${error.message}`,
          );
        }
      }

      const wasEmptyBefore = !version.file;

      // Upload the file
      const fileUrl = await this.s3Service.uploadFile(file);

      // Update the version with the file URL
      version.file = fileUrl;
      version.changes = changes ?? null;
      await this.applyWorkflowStatusAfterFirstVersionFill(
        document,
        version,
        wasEmptyBefore,
        user,
      );
      await this.versionRepo.save(version);
      if (wasEmptyBefore) {
        await this.publishDocumentCurrentVersionIfAutoPublished(
          document,
          version,
        );
      }

      return {
        id: documentId,
        versionNumber: version.versionNumber,
        file: fileUrl,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_078", { cause: error }),
      );
    }
  }

  private async resolveDocumentReviewParticipants(
    document: Document,
    user: UserRequest,
  ): Promise<{ approvers: User[]; reviewers: User[] }> {
    let approvers: User[] = [];
    let reviewers: User[] = [];
    if (document.approvalStrategy.allApprovers) {
      approvers = await this.permissionService.usersWithAccess(
        [document.team.id],
        user,
        DocumentPermission.subject,
      );
    } else {
      const strategyApprovers = document.approvalStrategy.documentApprovers
        .filter((approver) => approver.roleType === "approver")
        .map((approver) => approver.user);
      approvers = await this.filterRoleUsersByTeamMembership(
        strategyApprovers,
        document.team.id,
      );
    }
    if (document.approvalStrategy.allReviewers) {
      reviewers = await this.permissionService.usersWithAccess(
        [document.team.id],
        user,
        DocumentPermission.subject,
      );
    } else {
      const strategyReviewers = document.approvalStrategy.documentApprovers
        .filter((reviewer) => reviewer.roleType === "reviewer")
        .map((reviewer) => reviewer.user);
      reviewers = await this.filterRoleUsersByTeamMembership(
        strategyReviewers,
        document.team.id,
      );
    }
    return { approvers, reviewers };
  }

  private async canUserAnnotateDocument(
    document: Document,
    user: UserRequest,
  ): Promise<boolean> {
    if (document.createdBy?.id === user.id) {
      return true;
    }

    const {
      approvers,
      reviewers,
    } = await this.resolveDocumentReviewParticipants(document, user);
    if (
      approvers.some((approver) => approver.id === user.id) ||
      reviewers.some((reviewer) => reviewer.id === user.id)
    ) {
      return true;
    }

    const acknowledgers = await this.getAcknowledgersForDocument(
      document,
      user,
    );
    return acknowledgers.some((acknowledger) => acknowledger.id === user.id);
  }

  async uploadVersionEditorContent(
    documentId: string,
    versionId: number,
    dto: UploadVersionEditorContentDto,
    user: UserRequest,
    file?: any,
  ) {
    try {
      if (!file) {
        throw new BadRequestException(documentHttpError("DOC_068"));
      }

      const document = await this.getDocumentById(documentId, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }
      this.assertCanEditDocumentContent(document, user);
      if (document.contentType !== ContentType.EDITOR) {
        throw new BadRequestException(documentHttpError("DOC_069"));
      }

      const version = await this.versionRepo.findOne({
        where: {
          id: versionId,
          documentId,
        },
        relations: ["document"],
      });

      if (!version) {
        throw new NotFoundException(documentHttpError("DOC_066"));
      }

      if (version.status !== DocumentStatus.PENDING) {
        throw new BadRequestException(documentHttpError("DOC_070"));
      }

      if (version.content) {
        try {
          await this.s3Service.deleteFile(version.content);
        } catch (error) {
          this.logger.warn(
            `Failed to delete previous editor content from storage: ${error?.message}`,
          );
        }
      }

      const title = (document.title || "document").replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      const originalname = file.originalname?.toLowerCase().endsWith(".docx")
        ? file.originalname
        : `${title}.docx`;
      const wasEmptyBefore = !version.content;

      const fileUrl = await this.s3Service.uploadFile({
        ...file,
        originalname,
      });
      version.content = fileUrl;
      if (dto.changes !== undefined) {
        version.changes = dto.changes || null;
      }
      await this.applyWorkflowStatusAfterFirstVersionFill(
        document,
        version,
        wasEmptyBefore,
        user,
      );
      await this.versionRepo.save(version);
      if (wasEmptyBefore) {
        await this.publishDocumentCurrentVersionIfAutoPublished(
          document,
          version,
        );
      }

      if (dto.documentDraftId) {
        await this.deleteDocumentDraft(dto.documentDraftId, user);
      }

      return {
        id: document.id,
        versionNumber: version.versionNumber,
        content: fileUrl,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_079", { cause: error }),
      );
    }
  }

  async uploadVersionChecklist(
    documentId: string,
    versionId: number,
    dto: UploadVersionChecklistDto,
    user: UserRequest,
  ) {
    try {
      const document = await this.getDocumentById(documentId, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }
      this.assertCanEditDocumentContent(document, user);
      if (document.contentType !== ContentType.CHECKLIST) {
        throw new BadRequestException(documentHttpError("DOC_114"));
      }

      const checklistDto = this.resolveChecklistDto(
        ContentType.CHECKLIST,
        dto.checklist,
        true,
      );

      const version = await this.versionRepo.findOne({
        where: {
          id: versionId,
          documentId,
        },
        relations: ["document", "checklist", "checklist.questions"],
      });

      if (!version) {
        throw new NotFoundException(documentHttpError("DOC_066"));
      }

      if (version.status !== DocumentStatus.PENDING) {
        throw new BadRequestException(documentHttpError("DOC_070"));
      }

      const wasEmptyBefore = !version.checklist;

      if (version.checklist) {
        await this.versionRepo.manager
          .getRepository(DocumentChecklist)
          .remove(version.checklist);
        version.checklist = null;
      }

      version.checklist = this.createChecklist(checklistDto!);
      if (dto.changes !== undefined) {
        version.changes = dto.changes || null;
      }
      await this.applyWorkflowStatusAfterFirstVersionFill(
        document,
        version,
        wasEmptyBefore,
        user,
      );
      await this.versionRepo.save(version);
      if (wasEmptyBefore) {
        await this.publishDocumentCurrentVersionIfAutoPublished(
          document,
          version,
        );
      }

      if (dto.documentDraftId) {
        await this.deleteDocumentDraft(dto.documentDraftId, user);
      }

      return {
        id: document.id,
        versionNumber: version.versionNumber,
        checklist: version.checklist,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_115", { cause: error }),
      );
    }
  }

  async saveVersionReviewComments(
    documentId: string,
    versionId: number,
    user: UserRequest,
    file?: any,
  ) {
    try {
      if (!file) {
        throw new BadRequestException(documentHttpError("DOC_068"));
      }

      const document = await this.getDocumentById(documentId, user);
      if (!document) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }
      if (document.contentType !== ContentType.EDITOR) {
        throw new BadRequestException(documentHttpError("DOC_069"));
      }
      const version = await this.versionRepo.findOne({
        where: {
          id: versionId,
          documentId,
        },
      });
      if (!version) {
        throw new NotFoundException(documentHttpError("DOC_066"));
      }

      if (!(await this.canUserAnnotateDocument(document, user))) {
        throw new BadRequestException(documentHttpError("DOC_093"));
      }

      const latestVersion = document.versions.reduce((max, current) =>
        current.versionNumber > max.versionNumber ? current : max,
      );
      if (latestVersion.id !== version.id) {
        throw new BadRequestException(documentHttpError("DOC_094"));
      }
      if (!version.content) {
        throw new NotFoundException(documentHttpError("DOC_010"));
      }

      try {
        await this.s3Service.deleteFile(version.content);
      } catch (error) {
        this.logger.warn(
          `Failed to delete previous editor content from storage: ${error?.message}`,
        );
      }

      const title = (document.title || "document").replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      const originalname = file.originalname?.toLowerCase().endsWith(".docx")
        ? file.originalname
        : `${title}.docx`;

      const fileUrl = await this.s3Service.uploadFile({
        ...file,
        originalname,
      });
      version.content = fileUrl;
      await this.versionRepo.save(version);

      return {
        id: document.id,
        versionNumber: version.versionNumber,
        content: fileUrl,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_095", { cause: error }),
      );
    }
  }

  // Document Template Methods
  async getDocumentTemplates(
    paginationDto: PaginationDto = { page: 1, perPage: 10 },
    filterDto?: DocumentTemplateFilterDto,
  ): Promise<{ data: DocumentTemplateDto[]; totalCount: number }> {
    const { page = 1, perPage = 10 } = paginationDto;
    const qb = this.documentTemplateRepository
      .createQueryBuilder("documentTemplate")
      .where("documentTemplate.deleted = :deleted", { deleted: false })
      .select([
        "documentTemplate.id",
        "documentTemplate.title",
        "documentTemplate.description",
        "documentTemplate.isDefault",
        "documentTemplate.createdAt",
      ])
      .orderBy("documentTemplate.isDefault", "DESC")
      .addOrderBy("documentTemplate.createdAt", "DESC");

    if (filterDto?.isDefault === "true" || filterDto?.isDefault === "false") {
      const isDefault = filterDto.isDefault === "true";
      qb.andWhere("documentTemplate.isDefault = :isDefault", { isDefault });
    }

    if (filterDto?.search) {
      const term = `%${filterDto.search.toLowerCase()}%`;
      if (filterDto.searchTitleOnly) {
        qb.andWhere("LOWER(documentTemplate.title) LIKE :search", {
          search: term,
        });
      } else {
        qb.andWhere(
          "(LOWER(documentTemplate.title) LIKE :search OR LOWER(documentTemplate.description) LIKE :search)",
          { search: term },
        );
      }
    }

    const skip = (page - 1) * perPage;
    const [rows, totalCount] = await qb
      .skip(skip)
      .take(perPage)
      .getManyAndCount();

    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
    }));
    return { data, totalCount };
  }

  async deleteDocumentTemplate(
    documentTemplateId: string,
  ): Promise<{ id: string }> {
    try {
      const documentTemplate = await this.documentTemplateRepository.findOne({
        where: { id: documentTemplateId, deleted: false },
      });
      if (!documentTemplate) {
        throw new NotFoundException(documentHttpError("DOC_006"));
      }
      const documents = await this.documentRepository.find({
        where: {
          documentTemplate: { id: documentTemplateId },
          deleted: false,
        },
      });
      if (documents.length > 0) {
        throw new BadRequestException(documentHttpError("DOC_071"));
      }
      documentTemplate.deleted = true;
      documentTemplate.title = `${
        documentTemplate.title
      }-deleted-${Date.now()}`;
      await this.documentTemplateRepository.save(documentTemplate);
      // Return id so HistoryInterceptor can use it as entityId when publishing the notification event.
      return { id: documentTemplate.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_072", { cause: error }),
      );
    }
  }

  private mapDocumentDraftCreatedBy(
    createdBy?: User | null,
  ): DocumentDraftListItemDto["createdBy"] {
    if (!createdBy) {
      return undefined;
    }
    return {
      id: createdBy.id,
      fname: createdBy.fname,
      lname: createdBy.lname,
    };
  }

  private async generateNextDraftTitle(createdById: string): Promise<string> {
    const drafts = await this.documentDraftRepository.find({
      where: { createdById },
      select: ["title"],
    });
    let maxNumber = 0;
    for (const draft of drafts) {
      const match = /^Draft-(\d+)$/.exec(draft.title?.trim() ?? "");
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    }
    return `Draft-${String(maxNumber + 1).padStart(3, "0")}`;
  }

  private async assertDocumentTeamAccessForDraft(
    documentId: string,
    user: UserRequest,
  ): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        deleted: false,
      },
      relations: ["team"],
    });

    if (!document) {
      throw new NotFoundException(documentHttpError("DOC_007"));
    }

    const hasAccess = await this.permissionService.usersWithAccess(
      [document.team.id],
      user,
      DocumentPermission.subject,
      false,
      user.id,
    );

    if (!hasAccess.length) {
      throw new NotFoundException(documentHttpError("DOC_044"));
    }
  }

  private async resolveDraftLinksForCreate(
    dto: CreateDocumentDraftDto,
    user: UserRequest,
  ): Promise<{
    resolvedDocumentId: string | null;
    documentVersionId: number | null;
  }> {
    let resolvedDocumentId: string | null = dto.documentId ?? null;

    if (dto.documentVersionId != null) {
      const version = await this.versionRepo.findOne({
        where: {
          id: dto.documentVersionId,
        },
        relations: ["document", "document.team"],
      });

      if (!version) {
        throw new NotFoundException(documentHttpError("DOC_066"));
      }

      if (!version.document || version.document.deleted) {
        throw new NotFoundException(documentHttpError("DOC_007"));
      }

      if (dto.documentId && version.documentId !== dto.documentId) {
        throw new BadRequestException(documentHttpError("DOC_084"));
      }

      resolvedDocumentId = version.documentId;
      await this.assertDocumentTeamAccessForDraft(version.documentId, user);
    } else if (resolvedDocumentId) {
      await this.assertDocumentTeamAccessForDraft(resolvedDocumentId, user);
    }

    return {
      resolvedDocumentId,
      documentVersionId: dto.documentVersionId ?? null,
    };
  }

  private async uploadDraftDocxFile(
    file: any,
    fileNameBase: string,
    user: UserRequest,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException(documentHttpError("DOC_001"));
    }

    const base = (fileNameBase || "draft").replace(/[^a-zA-Z0-9._-]/g, "_");
    const originalname = file.originalname?.toLowerCase().endsWith(".docx")
      ? file.originalname
      : `${base}.docx`;

    return this.s3Service.uploadFile({ ...file, originalname });
  }

  private toDocumentDraftListItem(
    draft: DocumentDraft,
  ): DocumentDraftListItemDto {
    return {
      id: draft.id,
      title: draft.title,
      documentId: draft.documentId,
      documentVersionId: draft.documentVersionId,
      document:
        draft.document?.id != null
          ? { id: draft.document.id, title: draft.document.title }
          : null,
      documentVersion:
        draft.documentVersion?.id != null
          ? {
              id: draft.documentVersion.id,
              versionNumber: draft.documentVersion.versionNumber,
            }
          : null,
      updatedAt: draft.updatedAt,
      createdAt: draft.createdAt,
    };
  }

  async getDocumentDrafts(
    user: UserRequest,
    paginationDto: PaginationDto,
    filterDto: DocumentDraftFilterDto,
  ): Promise<PaginatedResponse<DocumentDraftListItemDto>> {
    const { page = 1, perPage = 10 } = paginationDto;
    const skip = (page - 1) * perPage;

    const queryBuilder = this.documentDraftRepository
      .createQueryBuilder("draft")
      .leftJoin("draft.document", "document")
      .leftJoin("draft.documentVersion", "documentVersion")
      .where("draft.createdById = :createdById", { createdById: user.id });

    if (filterDto.search?.trim()) {
      queryBuilder.andWhere("LOWER(draft.title) LIKE LOWER(:search)", {
        search: `%${filterDto.search.trim()}%`,
      });
    }

    const total = await queryBuilder.getCount();

    const drafts = await queryBuilder
      .select([
        "draft.id",
        "draft.title",
        "draft.documentId",
        "draft.documentVersionId",
        "draft.updatedAt",
        "draft.createdAt",
        "document.id",
        "document.title",
        "documentVersion.id",
        "documentVersion.versionNumber",
      ])
      .orderBy("draft.updatedAt", "DESC")
      .skip(skip)
      .take(perPage)
      .getMany();

    return {
      data: drafts.map((draft) => this.toDocumentDraftListItem(draft)),
      currentPage: page,
      totalCount: total,
      perPage,
    };
  }

  async getDocumentDraftById(
    draftId: string,
    user: UserRequest,
  ): Promise<DocumentDraftDetailDto> {
    const draft = await this.documentDraftRepository.findOne({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException(documentHttpError("DOC_085"));
    }

    if (draft.documentId) {
      await this.assertDocumentTeamAccessForDraft(draft.documentId, user);
    }

    const result: DocumentDraftDetailDto = {
      id: draft.id,
      title: draft.title,
      documentId: draft.documentId,
      documentVersionId: draft.documentVersionId,
    };

    if (draft.content) {
      try {
        result.contentUrl = await this.s3Service.getSignedUrlForDownload(
          draft.content,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to fetch draft content ${draftId}: ${error?.message}`,
        );
        throw new BadRequestException(
          documentHttpError("DOC_083", { cause: error }),
        );
      }
    }

    return result;
  }

  async deleteDocumentDraft(
    draftId: string,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const draft = await this.documentDraftRepository.findOne({
        where: { id: draftId },
      });

      if (!draft) {
        throw new NotFoundException(documentHttpError("DOC_085"));
      }

      if (draft.documentId) {
        await this.assertDocumentTeamAccessForDraft(draft.documentId, user);
      }

      if (draft.content) {
        try {
          await this.s3Service.deleteFile(draft.content);
        } catch (error) {
          this.logger.warn(
            `Failed to delete draft content from storage: ${error?.message}`,
          );
        }
      }

      await this.documentDraftRepository.remove(draft);
      return { id: draftId };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_086", { cause: error }),
      );
    }
  }

  async saveDocumentDraft(
    draftId: string | undefined,
    dto: CreateDocumentDraftDto | UpdateDocumentDraftDto,
    user: UserRequest,
    file?: any,
  ): Promise<{ id: string }> {
    try {
      if (draftId) {
        const draft = await this.documentDraftRepository.findOne({
          where: { id: draftId },
        });

        if (!draft) {
          throw new NotFoundException(documentHttpError("DOC_085"));
        }

        if (draft.documentId) {
          await this.assertDocumentTeamAccessForDraft(draft.documentId, user);
        }

        if (!file) {
          throw new BadRequestException(documentHttpError("DOC_001"));
        }

        const contentUrl = await this.uploadDraftDocxFile(
          file,
          draft.title,
          user,
        );

        if (draft.content) {
          try {
            await this.s3Service.deleteFile(draft.content);
          } catch (error) {
            this.logger.warn(
              `Failed to delete old draft content from storage: ${error?.message}`,
            );
          }
        }

        draft.content = contentUrl;
        draft.updatedAt = new Date().valueOf();
        await this.documentDraftRepository.save(draft);
        return { id: draft.id };
      }

      if (!file) {
        throw new BadRequestException(documentHttpError("DOC_001"));
      }

      const createDto = dto as CreateDocumentDraftDto;
      const {
        resolvedDocumentId,
        documentVersionId,
      } = await this.resolveDraftLinksForCreate(createDto, user);

      const autoTitle = await this.generateNextDraftTitle(user.id);

      const contentUrl = await this.uploadDraftDocxFile(file, autoTitle, user);

      const now = new Date().valueOf();
      const draft = this.documentDraftRepository.create({
        title: autoTitle,
        content: contentUrl,
        documentId: resolvedDocumentId,
        documentVersionId,
        createdBy: { id: user.id } as User,
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
      });

      await this.documentDraftRepository.save(draft);
      return { id: draft.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        documentHttpError("DOC_083", { cause: error }),
      );
    }
  }
}
