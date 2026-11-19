import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  HttpException,
} from "@nestjs/common";
import { immediateActionHttpError } from "./immediate-action.errors";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ImmediateAction,
  ImmediateActionEvidenceType,
  ImmediateActionStatus,
} from "./immediate-action.entity";
import { User } from "../user/user.entity";
import { BaseUserDTO } from "../user/user.dto";
import { ImmediateActionEvidence } from "./evidence.entity";
import {
  ImmediateActionComment,
  ImmediateActionCommentType,
} from "./immediate-action-comment.entity";
import {
  NotificationInfoResponse,
  NotificationRecipient,
} from "../notification/notification-handler/dto";
import { LocalFileService } from "./local-file.service";
import { ApiProperty } from "@nestjs/swagger";

export interface ParentEntityConfig {
  repository: Repository<any>;
  relationField: "nc";
  entityName: string;
  parentRelations?: string[];
  getOrgUnitId?: (entity: any) => string | string[];
  assertMutable?: (entity: any) => void;
}

export interface PermissionChecker {
  checkAccess(user: any, orgUnitIds: string[]): Promise<boolean>;
}

export interface CreateImmediateActionRequest {
  parentEntityId: string;
  description: string;
  assigneeUserId: string;
  dueDate?: number;
  evidenceType?: ImmediateActionEvidenceType;
}

export interface UpdateImmediateActionRequest {
  description?: string;
  assigneeUserId?: string;
  dueDate?: number;
  status?: string;
  rejectionExplanation?: string;
  evidenceType?: ImmediateActionEvidenceType;
}

export interface ImmediateActionResponse {
  id: string;
  parentEntityId?: string;
  parentType?: "nc";
  description: string;
  assignedTo: BaseUserDTO;
  createdBy: BaseUserDTO;
  dueDate?: number;
  status: ImmediateActionStatus;
  evidenceType: ImmediateActionEvidenceType;
  verifiedBy?: BaseUserDTO;
  verifiedAt?: number;
  closedAt?: number;
  appliedAt?: number;
  rejectionExplanation?: string;
  createdAt: number;
  evidences: ImmediateActionEvidenceResponse[];
  comments: ImmediateActionCommentResponse[];
}

export class ImmediateActionEvidenceResponse {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty({ type: () => BaseUserDTO })
  createdBy: BaseUserDTO;

  @ApiProperty({ description: "Unix time in milliseconds." })
  createdAt: number;
}

export class ImmediateActionCommentResponse {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ enum: ImmediateActionCommentType })
  type: ImmediateActionCommentType;

  @ApiProperty({ type: () => BaseUserDTO })
  createdBy: BaseUserDTO;

  @ApiProperty({ description: "Unix time in milliseconds." })
  createdAt: number;
}

@Injectable()
export class ImmediateActionCommonService {
  private readonly logger = new Logger(ImmediateActionCommonService.name);

  constructor(
    @InjectRepository(ImmediateAction)
    private readonly immediateActionRepository: Repository<ImmediateAction>,
    @InjectRepository(ImmediateActionEvidence)
    private readonly immediateActionEvidenceRepository: Repository<ImmediateActionEvidence>,
    @InjectRepository(ImmediateActionComment)
    private readonly commentRepository: Repository<ImmediateActionComment>,
    private readonly s3Service: LocalFileService,
  ) {}

  async createImmediateAction(
    request: CreateImmediateActionRequest,
    user: any,
    config: ParentEntityConfig,
    permissionChecker?: PermissionChecker,
  ): Promise<{ id: string }> {
    const parentEntity = await config.repository.findOne({
      where: { id: request.parentEntityId },
      relations: config.parentRelations ?? [],
    });

    if (!parentEntity) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_001", {
          params: { entityName: config.entityName },
        }),
      );
    }

    config.assertMutable?.(parentEntity);

    if (permissionChecker && config.getOrgUnitId) {
      const orgUnitIds = this.normalizeOrgUnitIds(
        config.getOrgUnitId(parentEntity),
      );
      const hasAccess = await permissionChecker.checkAccess(user, orgUnitIds);
      if (!hasAccess) {
        throw new NotFoundException(
          immediateActionHttpError("IMMEDIATE_ACTION_002"),
        );
      }
    }

    if (
      config.relationField === "nc" &&
      request.dueDate &&
      (parentEntity as any)?.dueDate
    ) {
      if (request.dueDate > (parentEntity as any).dueDate) {
        throw new BadRequestException(
          immediateActionHttpError("IMMEDIATE_ACTION_003"),
        );
      }
    }

    const newAction = this.immediateActionRepository.create({
      [config.relationField]: { id: request.parentEntityId },
      description: request.description,
      assignedTo: { id: request.assigneeUserId } as User,
      dueDate: request.dueDate,
      status: ImmediateActionStatus.OPEN,
      evidenceType: request.evidenceType ?? ImmediateActionEvidenceType.FILE,
      createdBy: { id: user.id } as User,
      createdAt: Date.now(),
    });

    const savedAction = await this.immediateActionRepository.save(newAction);
    return { id: savedAction.id };
  }

  async getImmediateActions(
    parentEntityId: string,
    user: any,
    filter: any,
    config: ParentEntityConfig,
  ): Promise<ImmediateActionResponse[]> {
    const query = this.immediateActionRepository
      .createQueryBuilder("immediateAction")
      .leftJoinAndSelect("immediateAction.assignedTo", "assignedTo")
      .leftJoinAndSelect("immediateAction.verifiedBy", "verifiedBy")
      .leftJoinAndSelect("immediateAction.createdBy", "createdBy")
      .leftJoinAndSelect("immediateAction.evidence", "evidence")
      .leftJoinAndSelect("evidence.createdBy", "evidenceCreatedBy")
      .leftJoinAndSelect("immediateAction.comments", "comments")
      .leftJoinAndSelect("comments.createdBy", "commentCreatedBy")
      .leftJoinAndSelect("immediateAction.nc", "nc");

    if (parentEntityId) {
      query.andWhere("nc.id = :parentEntityId", { parentEntityId });
    } else if (config.relationField) {
      query.andWhere("nc.id IS NOT NULL");
    }

    if (filter.status) {
      query.andWhere("immediateAction.status = :status", {
        status: filter.status,
      });
    }
    if (filter.statuses) {
      query.andWhere("immediateAction.status IN (:...statuses)", {
        statuses: filter.statuses as ImmediateActionStatus[],
      });
    }
    if (filter.dueDate) {
      query.andWhere("immediateAction.dueDate < :dueDate", {
        dueDate: filter.dueDate,
      });
    }

    if (filter.assigned_to_id || filter.assigneeId) {
      query.andWhere("assignedTo.id = :assignedToId", {
        assignedToId: filter.assigneeId ?? filter.assigned_to_id,
      });
    }

    if (filter.created_by_id || filter.createdById) {
      query.andWhere("createdBy.id = :createdById", {
        createdById: filter.createdById ?? filter.created_by_id,
      });
    }

    if (filter.created_in_last_days) {
      const days = Number(filter.created_in_last_days);
      if (!Number.isNaN(days) && days > 0) {
        const startOfTodayUtc = new Date();
        startOfTodayUtc.setUTCHours(0, 0, 0, 0);
        const createdAfter =
          startOfTodayUtc.getTime() - (days - 1) * 24 * 60 * 60 * 1000;
        query.andWhere("immediateAction.createdAt >= :createdAfter", {
          createdAfter,
        });
      }
    }

    if (filter.search) {
      query.andWhere("LOWER(immediateAction.description) LIKE LOWER(:search)", {
        search: `%${filter.search}%`,
      });
    }

    const actions = await query.getMany();
    return actions.map((action) => this.formatResponse(action));
  }

  async resolveImmediateActionForNotification(
    entityId: string,
    clientId: string,
    relations: string[] = ["createdBy"],
  ): Promise<ImmediateAction | null> {
    const action = await this.findImmediateActionById(
      entityId,
      clientId,
      relations,
    );
    if (action) {
      return action;
    }

    const evidence = await this.immediateActionEvidenceRepository.findOne({
      where: { id: entityId },
      relations: ["immediateAction"],
    });
    if (evidence?.immediateAction?.id) {
      return this.findImmediateActionById(
        evidence.immediateAction.id,
        clientId,
        relations,
      );
    }

    const comment = await this.commentRepository.findOne({
      where: { id: entityId },
      relations: ["immediateAction"],
    });
    if (!comment?.immediateAction?.id) {
      return null;
    }

    return this.findImmediateActionById(
      comment.immediateAction.id,
      clientId,
      relations,
    );
  }

  getCreatorExtraMessage(method: string): string {
    switch (method) {
      case "updateImmediateActionStatus":
      case "verifyImmediateAction":
        return "changed the status of an immediate action you created";
      case "createImmediateActionEvidence":
        return "uploaded evidence on an immediate action you created";
      case "deleteImmediateActionEvidence":
        return "deleted evidence from an immediate action you created";
      case "createImmediateActionComment":
        return "commented on an immediate action you created";
      case "deleteImmediateActionComment":
        return "deleted a comment from an immediate action you created";
      case "deleteImmediateAction":
        return "deleted an immediate action you created";
      case "createImmediateAction":
        return "created an immediate action";
      default:
        return "updated an immediate action you created";
    }
  }

  private readonly IA_CREATE_METHODS: Record<string, true> = {
    createImmediateAction: true,
  };

  private readonly IA_STATUS_METHODS: Record<string, true> = {
    updateImmediateActionStatus: true,
    verifyImmediateAction: true,
  };

  buildImmediateActionNotificationInfo(params: {
    method: string;
    action: ImmediateAction;
    route: string;
    creatorExtraMessage?: string;
  }): NotificationInfoResponse {
    const { method, action, route, creatorExtraMessage } = params;
    const recipients: NotificationRecipient[] = [];

    const addRecipient = (user: User | undefined, message: string) => {
      if (!user?.id || recipients.some((existing) => existing.user.id === user.id)) {
        return;
      }
      recipients.push({ user, message });
    };

    if (this.IA_CREATE_METHODS[method] && action.assignedTo) {
      addRecipient(action.assignedTo, "assigned you an immediate action");
    } else if (this.IA_STATUS_METHODS[method]) {
      if (
        action.status === ImmediateActionStatus.READY_FOR_VERIFICATION &&
        action.createdBy
      ) {
        addRecipient(
          action.createdBy,
          "marked an immediate action ready for your verification",
        );
      } else if (
        action.status === ImmediateActionStatus.VERIFIED &&
        action.assignedTo
      ) {
        addRecipient(action.assignedTo, "verified your immediate action");
      } else if (
        action.status === ImmediateActionStatus.REJECTED &&
        action.createdBy
      ) {
        addRecipient(
          action.createdBy,
          creatorExtraMessage ??
            "changed the status of an immediate action you created",
        );
      } else if (action.createdBy) {
        addRecipient(
          action.createdBy,
          creatorExtraMessage ?? this.getCreatorExtraMessage(method),
        );
      }
    } else if (action.createdBy) {
      addRecipient(
        action.createdBy,
        creatorExtraMessage ?? this.getCreatorExtraMessage(method),
      );
    }

    return {
      skip: recipients.length === 0,
      route,
      recipients,
    };
  }

  async findOneImmediateAction(
    actionId: string,
    user: any,
    config: ParentEntityConfig,
  ): Promise<ImmediateActionResponse> {
    const action = await this.immediateActionRepository.findOne({
      where: { id: actionId },
      relations: [
        "assignedTo",
        "verifiedBy",
        "createdBy",
        "nc",
        ...(config.parentRelations?.map(
          (relation) => `${config.relationField}.${relation}`,
        ) ?? []),
        "evidence",
        "evidence.createdBy",
        "comments",
        "comments.createdBy",
      ],
    });

    if (!action) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_005"),
      );
    }

    return this.formatResponse(action);
  }

  async updateImmediateAction(
    actionId: string,
    request: UpdateImmediateActionRequest,
    user: any,
    config: ParentEntityConfig,
    permissionChecker?: PermissionChecker,
  ): Promise<void> {
    const action = await this.immediateActionRepository.findOne({
      where: { id: actionId },
      relations: [
        config.relationField,
        ...(config.parentRelations?.map(
          (relation) => `${config.relationField}.${relation}`,
        ) ?? []),
        "assignedTo",
        "createdBy",
      ],
    });

    if (!action) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_005"),
      );
    }

    config.assertMutable?.(action[config.relationField]);

    const allowAssigneeStatusUpdate = this.isAssigneeStatusOnlyUpdate(
      action,
      user.id,
      request,
    );

    if (permissionChecker && config.getOrgUnitId && !allowAssigneeStatusUpdate) {
      const parentEntity = action[config.relationField];
      const orgUnitIds = this.normalizeOrgUnitIds(
        config.getOrgUnitId(parentEntity),
      );
      const hasAccess = await permissionChecker.checkAccess(user, orgUnitIds);
      if (!hasAccess) {
        throw new NotFoundException(
          immediateActionHttpError("IMMEDIATE_ACTION_002"),
        );
      }
    }

    if (action.status === ImmediateActionStatus.VERIFIED) {
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_006"),
      );
    }

    if (request.status !== undefined) {
      const previousStatus = action.status;
      action.status = request.status as ImmediateActionStatus;

      const now = Date.now();
      switch (request.status) {
        case ImmediateActionStatus.VERIFIED:
          action.closedAt = now;
          if (previousStatus === ImmediateActionStatus.READY_FOR_VERIFICATION) {
            action.verifiedAt = now;
            action.verifiedBy = { id: user.id } as User;
          }
          break;
        case ImmediateActionStatus.READY_FOR_VERIFICATION:
          action.appliedAt = now;
          break;
        case ImmediateActionStatus.REJECTED: {
          const rejectionReason = request.rejectionExplanation?.trim();
          if (!rejectionReason) {
            throw new BadRequestException(
              immediateActionHttpError("IMMEDIATE_ACTION_018"),
            );
          }
          action.rejectionExplanation = rejectionReason;
          break;
        }
      }
    }

    if (request.description !== undefined) {
      action.description = request.description;
    }

    if (request.assigneeUserId !== undefined) {
      action.assignedTo = { id: request.assigneeUserId } as User;
      action.status = ImmediateActionStatus.OPEN;
    }

    if (request.dueDate !== undefined) {
      const parentEntity = action[config.relationField];
      if (
        config.relationField === "nc" &&
        request.dueDate &&
        (parentEntity as any)?.dueDate
      ) {
        if (request.dueDate > (parentEntity as any).dueDate) {
          throw new BadRequestException(
            immediateActionHttpError("IMMEDIATE_ACTION_004"),
          );
        }
      }
      action.dueDate = request.dueDate;
    }

    if (request.evidenceType !== undefined) {
      action.evidenceType = request.evidenceType;
    }

    if (request.rejectionExplanation !== undefined && !request.status) {
      action.rejectionExplanation = request.rejectionExplanation;
    }

    await this.immediateActionRepository.save(action);

    if (
      request.status === ImmediateActionStatus.REJECTED &&
      action.rejectionExplanation?.trim()
    ) {
      await this.createCommentInternal(
        action,
        action.rejectionExplanation.trim(),
        user,
        ImmediateActionCommentType.REJECTION,
      );
    }
  }

  async deleteImmediateAction(
    actionId: string,
    user: any,
    config: ParentEntityConfig,
    permissionChecker?: PermissionChecker,
  ): Promise<void> {
    const action = await this.immediateActionRepository.findOne({
      where: { id: actionId },
      relations: [
        config.relationField,
        ...(config.parentRelations?.map(
          (relation) => `${config.relationField}.${relation}`,
        ) ?? []),
      ],
    });

    if (!action) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_005"),
      );
    }

    config.assertMutable?.(action[config.relationField]);

    if (permissionChecker && config.getOrgUnitId) {
      const parentEntity = action[config.relationField];
      const orgUnitIds = this.normalizeOrgUnitIds(
        config.getOrgUnitId(parentEntity),
      );
      const hasAccess = await permissionChecker.checkAccess(user, orgUnitIds);
      if (!hasAccess) {
        throw new NotFoundException(
          immediateActionHttpError("IMMEDIATE_ACTION_002"),
        );
      }
    }

    if (action.status !== ImmediateActionStatus.OPEN) {
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_007"),
      );
    }
    await this.immediateActionEvidenceRepository.delete({
      immediateAction: { id: actionId },
    });
    await this.commentRepository.delete({
      immediateAction: { id: actionId },
    });
    await this.immediateActionRepository.remove(action);
  }

  async createImmediateActionComment(
    actionId: string,
    text: string,
    user: any,
  ): Promise<{ id: string }> {
    const trimmed = text?.trim();
    if (!trimmed) {
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_019"),
      );
    }

    const action = await this.immediateActionRepository.findOne({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_005"),
      );
    }

    const comment = await this.createCommentInternal(
      action,
      trimmed,
      user,
      ImmediateActionCommentType.USER,
    );
    return { id: comment.id };
  }

  async deleteImmediateActionComment(
    commentId: string,
    user: any,
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ["createdBy"],
    });

    if (!comment) {
      throw new NotFoundException(
        immediateActionHttpError("IMMEDIATE_ACTION_020"),
      );
    }

    if (comment.type === ImmediateActionCommentType.REJECTION) {
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_022"),
      );
    }

    if (comment.createdBy?.id !== user.id) {
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_021"),
      );
    }

    await this.commentRepository.remove(comment);
  }

  async createImmediateActionEvidence(
    immediate_action_id: string,
    user: any,
    file: any,
  ): Promise<{ id: string }> {
    try {
      const immediateAction = await this.immediateActionRepository.findOne({
        where: { id: immediate_action_id },
      });

      if (!immediateAction) {
        throw new BadRequestException(
          immediateActionHttpError("IMMEDIATE_ACTION_005"),
        );
      }

      if (!file) {
        throw new BadRequestException(
          immediateActionHttpError("IMMEDIATE_ACTION_009"),
        );
      }

      const fileUrl = await this.s3Service.uploadFile(file);

      const immediateActionEvidence =
        this.immediateActionEvidenceRepository.create({
          immediateAction: { id: immediate_action_id } as ImmediateAction,
          filename: fileUrl,
          createdBy: { id: user.id } as User,
          createdAt: Date.now(),
        });

      const savedEvidence = await this.immediateActionEvidenceRepository.save(
        immediateActionEvidence,
      );

      return { id: savedEvidence.id };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_OPERATION_FAILED", {
          cause: error,
        }),
      );
    }
  }

  async deleteImmediateActionEvidence(id: string, user: any): Promise<void> {
    try {
      const evidence = await this.immediateActionEvidenceRepository.findOne({
        where: { id },
      });

      if (!evidence) {
        throw new BadRequestException(
          immediateActionHttpError("IMMEDIATE_ACTION_010"),
        );
      }

      if (evidence.filename) {
        await this.s3Service.deleteFile(evidence.filename);
      }

      await this.immediateActionEvidenceRepository.remove(evidence);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        immediateActionHttpError("IMMEDIATE_ACTION_OPERATION_FAILED", {
          cause: error,
        }),
      );
    }
  }

  /**
   * Assignee can mark IA ready for verification without org access.
   * Verify / reject and field edits still require org-unit permission.
   */
  private isAssigneeStatusOnlyUpdate(
    action: ImmediateAction,
    userId: string,
    request: UpdateImmediateActionRequest,
  ): boolean {
    if (action.assignedTo?.id !== userId || request.status === undefined) {
      return false;
    }
    if (request.status !== ImmediateActionStatus.READY_FOR_VERIFICATION) {
      return false;
    }
    const hasOtherMutations =
      request.description !== undefined ||
      request.assigneeUserId !== undefined ||
      request.dueDate !== undefined ||
      request.evidenceType !== undefined;
    return !hasOtherMutations;
  }

  private formatResponse(action: ImmediateAction): ImmediateActionResponse {
    return {
      id: action.id,
      parentEntityId: action.nc?.id,
      parentType: "nc",
      description: action.description,
      assignedTo: this.formatUser(action.assignedTo),
      createdBy: this.formatUser(action.createdBy),
      dueDate: action.dueDate,
      status: action.status,
      evidenceType: action.evidenceType ?? ImmediateActionEvidenceType.FILE,
      verifiedBy: action.verifiedBy
        ? this.formatUser(action.verifiedBy)
        : undefined,
      verifiedAt: action.verifiedAt,
      closedAt: action.closedAt,
      appliedAt: action.appliedAt,
      rejectionExplanation: action.rejectionExplanation,
      createdAt: action.createdAt,
      evidences:
        action.evidence?.map((evidence) =>
          this.formatEvidenceResponse(evidence),
        ) || [],
      comments: (action.comments || [])
        .slice()
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((comment) => this.formatCommentResponse(comment)),
    };
  }

  private formatUser(user: User): BaseUserDTO {
    return {
      id: user.id,
      fname: user.fname,
      lname: user.lname,
      email: user.email,
    };
  }

  private normalizeOrgUnitIds(orgUnitIds: string | string[]): string[] {
    return Array.isArray(orgUnitIds) ? orgUnitIds : [orgUnitIds];
  }

  private formatEvidenceResponse(
    evidence: ImmediateActionEvidence,
  ): ImmediateActionEvidenceResponse {
    return {
      id: evidence.id,
      filename: evidence.filename,
      createdAt: evidence.createdAt,
      createdBy: this.formatUser(evidence.createdBy),
    };
  }

  private formatCommentResponse(
    comment: ImmediateActionComment,
  ): ImmediateActionCommentResponse {
    return {
      id: comment.id,
      text: comment.text,
      type: comment.type,
      createdAt: comment.createdAt,
      createdBy: this.formatUser(comment.createdBy),
    };
  }

  private async findImmediateActionById(
    id: string,
    _clientId: string,
    relations: string[] = ["createdBy"],
  ): Promise<ImmediateAction | null> {
    return this.immediateActionRepository.findOne({
      where: { id },
      relations,
    });
  }

  private async createCommentInternal(
    action: ImmediateAction,
    text: string,
    user: any,
    type: ImmediateActionCommentType,
  ): Promise<ImmediateActionComment> {
    const comment = this.commentRepository.create({
      immediateAction: { id: action.id } as ImmediateAction,
      text,
      type,
      createdBy: { id: user.id } as User,
      createdAt: Date.now(),
    });
    return this.commentRepository.save(comment);
  }
}
