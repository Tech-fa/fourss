import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, Not, In } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { NCCustomFieldValue } from './entities/nc-custom-field-value.entity';
import { NonConformityType } from './entities/non-conformity-type.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CreateCategoryCustomFieldDto,
  UpdateCategoryCustomFieldDto,
  CategoryCustomFieldResponseDto,
  CreateNCCustomFieldValueDto,
  UpdateNCCustomFieldValueDto,
  NCCustomFieldValueResponseDto,
  CreateCategoryWithCustomFieldsDto,
  UpdateCategoryWithCustomFieldsDto,
  CreateNonConformityTypeDto,
  NonConformityTypeResponseDTO,
  UpdateNonConformityTypeDto,
  CreateNonConformityRiskLevelDto,
  NonConformityRiskLevelResponseDTO,
  UpdateNonConformityRiskLevelDto,
  BulkCreateNonConformityRiskLevelDto,
  CreateNonConformityDto,
  CreateNonConformityRepresentativeDto,
  UpdateNonConformityDto,
  CloseNonConformityDto,
  AmendNonConformityDueDateDto,
  NcDueDateAmendmentResponseDto,
  NonConformityResponseDTO,
  NonConformityRepresentativeResponseDTO,
  UpdateNonConformityRepresentativeDto,
  CreateNCCorrectiveActionDto,
  UpdateNCCorrectiveActionDto,
  CreateCaChangeRequestDto,
  CreateImmediateActionDto,
  UpdateImmediateActionDto,
  ImmediateActionResponseDTO,
  CreateEvidenceDto,
  EvidenceResponseDTO,
  CreateRootCauseAnalysisDto,
  UpdateRootCauseAnalysisDto,
  RootCauseAnalysisResponseDTO,
  CreateInvestigationDto,
  UpdateInvestigationDto,
  InvestigationResponseDTO,
  CreateInvestigationEvidenceDto,
  UpdateInvestigationEvidenceDto,
  InvestigationEvidenceResponseDTO,
  UpdateCaChangeRequestDto,
  RCAResponseDTO,
  CreateRCACeCategoryDto,
  BulkCreateRCACeCategoryDto,
  RCACeCategoryResponseDTO,
  CreateFishboneDto,
  UpdateFishboneDto,
  FishboneCauseDto,
} from './dtos';
import {
  CaChangeRequest,
  CaChangeRequestStatus,
  CaChangeRequestType,
} from './entities/ca_change_request.entity';

import { UserRequest } from '../permissions/dto';

import { TeamService } from '../teams/team.service';
import { TeamMember } from '../teams/team-member.entity';
import { NonConformityRiskLevel } from './entities/non-conformity-risk-level.entity';
import {
  NonConformity,
  NCStatus,
  NCREPRESENTATIVETYPE,
} from './entities/non-conformity.entity';
import { PermissionService } from '../permissions/permission.service';
import { LocalFileService } from '../common/local-file.service';
import {
  immediateActionPermission,
  nonConformityPermission,
} from '../permissions/permissions';
import { NonConformityRepresentative } from './entities/non-conformity-representative.entity';
import { NcDueDateAmendment } from './entities/nc-due-date-amendment.entity';
import {
  NCCorrectiveAction,
  NCCorrectiveActionSource,
  NCCorrectiveActionStatus,
} from './entities/nc-corrective-action.entity';
import { User } from '../user/user.entity';
import { AuditFinding } from '../audit/entities/audit-finding.entity';
import { AuditInstance } from '../audit/entities/audit-instance.entity';
import { ImmediateAction } from '../common/immediate-action.entity';
import { RootCauseAnalysis } from './entities/root-cause-analysis.entity';
import {
  Investigation,
  InvestigationAction,
} from './entities/investigation.entity';
import { InvestigationEvidence } from './entities/investigation-evidence.entity';
import { UsersService } from '../user/user.service';
import { QueuePublisher } from '../queue/queue.publisher';
import { EmailType } from '../common/dto';
import { CaEffectivenessEvidence } from './entities/ca-effectiveness-evidence.entity';
import { NCCorrectiveActionCauses } from './entities/nc-corrective-action-causes.entity';
import { ImmediateActionStatus } from '../common/immediate-action.entity';
import { RCAFiveWhyStep } from './entities/rca-fivewhy-step.entity';
import { BulkCreateRCAFiveWhyStepDto, CreateRCAFiveWhyStepDto } from './dtos';
import { RCACeCategory } from './entities/rca-ce-category.entity';
import { RCACeCause } from './entities/rca-ce-cause.entity';
import { RCAFishbone } from './entities/rca-fishbone.entity';
import { RootCauseAnalysisPerformer } from './entities/root-cause-analysis-performer.entity';
import {
  ImmediateActionCommonService,
  ParentEntityConfig,
  PermissionChecker,
  CreateImmediateActionRequest,
  ImmediateActionResponse,
} from '../common/immediate-action-common.service';
import { immediateActionHttpError } from '../common/immediate-action.errors';
import { NotificationInfo } from '../notification/notification-handler/notification.interface';
import {
  NotificationInfoParam,
  NotificationInfoResponse,
  NotificationRecipient,
} from '../notification/notification-handler/dto';
import { getLocalStartOfDay } from '../util/helper-util';
import {
  nonConformityHttpError,
  type NonConformityErrorCode,
} from './non-conformity.errors';
import { CorrectiveActionQueryDto } from './non-conformity.responses';

@Injectable()
export class NonConformityService implements NotificationInfo, OnModuleInit {
  private readonly ncConfig: ParentEntityConfig;
  private readonly ncPermissionChecker: PermissionChecker;
  private riskDefaultsReady = false;

  private readonly defaultRiskLevels = [
    { name: 'Major', description: 'Major non-conformity', order: 1 },
    { name: 'Minor', description: 'Minor non-conformity', order: 2 },
  ];
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(CategoryCustomField)
    private readonly categoryCustomFieldRepository: Repository<CategoryCustomField>,
    @InjectRepository(NCCustomFieldValue)
    private readonly ncCustomFieldValueRepository: Repository<NCCustomFieldValue>,
    @InjectRepository(NonConformityType)
    private readonly nonConformityTypeRepository: Repository<NonConformityType>,
    @InjectRepository(NonConformityRiskLevel)
    private readonly nonConformityRiskLevelRepository: Repository<NonConformityRiskLevel>,
    @InjectRepository(NonConformity)
    private readonly nonConformityRepository: Repository<NonConformity>,
    @InjectRepository(NcDueDateAmendment)
    private readonly ncDueDateAmendmentRepository: Repository<NcDueDateAmendment>,
    @InjectRepository(NonConformityRepresentative)
    private readonly nonConformityRepresentativeRepository: Repository<NonConformityRepresentative>,
    @InjectRepository(NCCorrectiveAction)
    private readonly ncCorrectiveActionRepository: Repository<NCCorrectiveAction>,
    @InjectRepository(ImmediateAction)
    private readonly immediateActionRepository: Repository<ImmediateAction>,
    @InjectRepository(CaChangeRequest)
    private readonly caChangeRequestRepository: Repository<CaChangeRequest>,
    @InjectRepository(RootCauseAnalysis)
    private readonly rootCauseAnalysisRepository: Repository<RootCauseAnalysis>,
    @InjectRepository(Investigation)
    private readonly investigationRepository: Repository<Investigation>,
    @InjectRepository(InvestigationEvidence)
    private readonly investigationEvidenceRepository: Repository<InvestigationEvidence>,
    @InjectRepository(CaEffectivenessEvidence)
    private readonly caEffectivenessEvidenceRepository: Repository<CaEffectivenessEvidence>,
    @InjectRepository(RCAFiveWhyStep)
    private readonly rcaFiveWhyStepRepository: Repository<RCAFiveWhyStep>,
    @InjectRepository(RCACeCategory)
    private readonly rcaCeCategoryRepository: Repository<RCACeCategory>,
    @InjectRepository(RCACeCause)
    private readonly rcaCeCauseRepository: Repository<RCACeCause>,
    @InjectRepository(RCAFishbone)
    private readonly rcaFishboneRepository: Repository<RCAFishbone>,
    @InjectRepository(RootCauseAnalysisPerformer)
    private readonly rootCauseAnalysisPerformerRepository: Repository<RootCauseAnalysisPerformer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    private readonly userService: UsersService,
    private readonly teamService: TeamService,
    private permissionService: PermissionService,
    private readonly fileService: LocalFileService,
    private readonly immediateActionCommonService: ImmediateActionCommonService,
    private readonly queuePublisher: QueuePublisher,
  ) {
    // Configure for NC immediate actions
    this.ncConfig = {
      repository: this.nonConformityRepository,
      relationField: 'nc',
      entityName: 'Non-conformity',
      getOrgUnitId: (nc) => String(nc.teamId),
      assertMutable: (parent) => this.assertNcMutable(parent),
    };
    this.ncPermissionChecker = {
      checkAccess: async (user: any, teamIds: string[]) => {
        // Convert string IDs to numbers as expected by the permission service
        const numericTeamIds = teamIds.map((id) => parseInt(id, 10));
        const usersWithAccess = await this.permissionService.usersWithAccess(
          numericTeamIds,
          user,
          immediateActionPermission.subject,
        );
        return usersWithAccess.length > 0;
      },
    };
  }
  private readonly logger = new Logger(NonConformityService.name);

  async onModuleInit() {
    await this.ensureDefaultRiskLevels();
  }

  private async ensureDefaultRiskLevels(): Promise<void> {
    if (this.riskDefaultsReady) return;
    try {
      const creator = await this.userRepository.findOne({
        where: { deleted: false },
        order: { createdAt: 'ASC' },
      });
      if (!creator) return;

      for (const item of this.defaultRiskLevels) {
        const existing = await this.nonConformityRiskLevelRepository
          .createQueryBuilder('riskLevel')
          .where('riskLevel.deleted = :deleted', { deleted: false })
          .andWhere('LOWER(riskLevel.name) = LOWER(:name)', { name: item.name })
          .getOne();
        if (existing) continue;
        await this.nonConformityRiskLevelRepository.save(
          this.nonConformityRiskLevelRepository.create({
            name: item.name,
            description: item.description,
            order: item.order,
            deleted: false,
            createdBy: { id: creator.id } as User,
          }),
        );
        this.logger.log(`Created default non-conformity risk level ${item.name}`);
      }
      this.riskDefaultsReady = true;
    } catch (error) {
      this.logger.error(
        `Failed to ensure default non-conformity risk levels: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async applyAuditAssignment(
    manager: EntityManager,
    nonConformity: NonConformity,
    dto: { findingId?: string; auditInstanceId?: string },
  ): Promise<void> {
    const findingId = dto.findingId?.trim() || undefined;
    const auditInstanceId = dto.auditInstanceId?.trim() || undefined;
    if (!findingId && !auditInstanceId) return;

    if (findingId) {
      const finding = await manager.findOne(AuditFinding, {
        where: { id: findingId },
        relations: ['auditInstance'],
      });
      if (!finding) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_084'));
      }
      if (
        auditInstanceId &&
        finding.auditInstance?.id !== auditInstanceId
      ) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_085'));
      }
      nonConformity.finding = { id: finding.id } as AuditFinding;
      nonConformity.findingId = finding.id;
      nonConformity.auditId = finding.auditInstance?.auditId ?? null;
      return;
    }

    const instance = await manager.findOne(AuditInstance, {
      where: { id: auditInstanceId },
    });
    if (!instance) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_083'));
    }
    nonConformity.auditId = instance.auditId ?? null;
  }

  private async bindFindingToNonConformity(
    manager: EntityManager,
    nonConformityId: string,
    findingId: string,
  ): Promise<void> {
    await manager.query(
      `UPDATE audit_findings SET non_conformity = NULL WHERE non_conformity = ? AND id <> ?`,
      [nonConformityId, findingId],
    );
    await manager.query(
      `UPDATE non_conformities SET finding_id = NULL, audit_id = NULL WHERE finding_id = ? AND id <> ?`,
      [findingId, nonConformityId],
    );
    await manager.query(
      `UPDATE audit_findings SET non_conformity = ?, raised_nc = 1 WHERE id = ?`,
      [nonConformityId, findingId],
    );
  }

  /** Re-throws Nest HTTP exceptions; otherwise wraps in a catalogued 400. */
  private throwNcCatalogOrRethrowHttp(
    error: unknown,
    fallbackCode: NonConformityErrorCode = 'NON_CONFORMITY_OPERATION_FAILED',
  ): never {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new BadRequestException(
      nonConformityHttpError(fallbackCode, { cause: error }),
    );
  }

  private isNcOverdue(nc: {
    status?: NCStatus;
    dueDate?: number | string | null;
  }): boolean {
    if (!nc || nc.status !== NCStatus.OPEN) {
      return false;
    }
    const due = Number(nc.dueDate);
    if (!Number.isFinite(due)) {
      return false;
    }
    return due < getLocalStartOfDay(Date.now());
  }

  private assertNcMutable(nc: {
    status?: NCStatus;
    dueDate?: number | string | null;
  }): void {
    if (!nc) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
    }
    if (nc.status === NCStatus.CLOSED) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_037'));
    }
    if (this.isNcOverdue(nc)) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_079'));
    }
  }

  private async assertNcMutableById(
    ncId: string,
  ): Promise<NonConformity> {
    const nc = await this.nonConformityRepository.findOne({
      where: { id: ncId, deleted: false },
    });
    if (!nc) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
    }
    this.assertNcMutable(nc);
    return nc;
  }

  private async assertImmediateActionNcMutable(
    actionId: string,
    user: any,
  ): Promise<void> {
    const action = await this.immediateActionRepository.findOne({
      where: { id: actionId },
      relations: ['nc'],
    });
    if (!action?.nc) {
      return;
    }
    this.assertNcMutable(action.nc);
  }

  private mapDueDateAmendments(
    amendments: NcDueDateAmendment[],
  ): NcDueDateAmendmentResponseDto[] {
    return amendments.map((amendment) => ({
      id: amendment.id,
      previousDueDate: Number(amendment.previousDueDate),
      newDueDate: Number(amendment.newDueDate),
      amendedAt: Number(amendment.amendedAt),
      amendedBy: amendment.amendedBy
        ? {
            id: amendment.amendedBy.id,
            fname: amendment.amendedBy.fname,
            lname: amendment.amendedBy.lname,
            email: amendment.amendedBy.email,
          }
        : undefined,
    }));
  }

  private accessibleTeamIds(user: { teamIds?: number[] }): number[] {
    return Array.isArray(user.teamIds) && user.teamIds.length > 0
      ? user.teamIds
      : [-1];
  }

  private async assertTeamAccess(
    user: UserRequest,
    teamId: number,
    action: string,
  ): Promise<void> {
    const team = await this.teamService.findById(teamId);
    if (!team || team.deleted) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_033'));
    }
    const access = await this.permissionService.hasPermissions(
      user,
      nonConformityPermission.subject,
      [action],
    );
    if (!access.hasPermission || !access.teamIds.includes(teamId)) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_033'));
    }
  }

  private async assertResponsibleUserBelongsToTeam(
    responsibleUserId: string,
    teamId: number,
  ): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { userId: responsibleUserId, teamId },
    });
    if (!membership) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_001'));
    }
  }

  private async createRcaCeCauseSubtree(
    categoryId: string,
    causes: FishboneCauseDto[],
    user: any,
    parent?: RCACeCause,
  ): Promise<void> {
    if (!causes?.length) return;
    for (let i = 0; i < causes.length; i++) {
      const current = causes[i];
      const created = await this.rcaCeCauseRepository.save(
        this.rcaCeCauseRepository.create({
          text: current.text,
          displayOrder: i,
          rcaCeCategory: { id: categoryId } as any,
          parent: parent ? parent : undefined,
          createdBy: { id: user.id } as User,
          createdById: user.id,
          createdAt: Date.now(),
        }),
      );
      if (current.children?.length) {
        await this.createRcaCeCauseSubtree(
          categoryId,
          current.children,
          user,
          created,
        );
      }
    }
  }

  // Category Methods
  async createCategory(
    createCategoryDto: CreateCategoryWithCustomFieldsDto,
    user: UserRequest,
  ): Promise<CategoryResponseDto> {
    const { name, parentId, customFields } = createCategoryDto;

    // Check for duplicate category name within same parent
    const existingQuery = this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name });

    if (parentId) {
      existingQuery.andWhere('category.parent.id = :parentId', { parentId });
    } else {
      existingQuery.andWhere('category.parent.id IS NULL');
    }
    const existingCategory = await existingQuery.getOne();
    if (existingCategory) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_002'),
      );
    }
    // Validate parent category exists if provided
    if (parentId) {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_004'));
      }
    }

    // Check for duplicate custom field labels if provided
    if (customFields && customFields.length > 0) {
      const customFieldLabels = customFields.map((field) => field.label);
      const uniqueLabels = [...new Set(customFieldLabels)];

      if (uniqueLabels.length !== customFieldLabels.length) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_003'),
        );
      }
    }
    // Create category with custom fields
    const category = this.categoryRepository.create({
      name,
      parent: parentId ? ({ id: parentId } as Category) : null,
      createdBy: { id: user.id },
      customFields:
        customFields?.map((customFieldData) =>
          this.categoryCustomFieldRepository.create({
            label: customFieldData.label,
            fieldType: customFieldData.fieldType,
            isRequired: customFieldData.isRequired || false,
            options: customFieldData.options
              ? JSON.stringify(customFieldData.options)
              : null,
            acceptedFiles: customFieldData.acceptedFiles
              ? JSON.stringify(customFieldData.acceptedFiles)
              : null,
          }),
        ) || [],
    });

    const savedCategory = await this.categoryRepository.save(category);

    // Return the complete category with custom fields
    return this.findCategoryById(savedCategory.id, user);
  }

  async findAllCategories(
    user: UserRequest,
    filter?: { search?: string; parentId?: string },
  ): Promise<CategoryResponseDto[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.createdBy', 'createdBy')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .leftJoinAndSelect('category.customFields', 'customFields')
      .andWhere('category.deleted = :deleted', { deleted: false });

    if (filter?.search) {
      query.andWhere('LOWER(category.name) LIKE LOWER(:search)', {
        search: `%${filter.search}%`,
      });
    }

    if (filter?.parentId) {
      query.andWhere('category.parentId = :parentId', {
        parentId: filter.parentId,
      });
    } else if (filter?.parentId === null) {
      query.andWhere('category.parentId IS NULL');
    }

    const categories = await query.orderBy('category.name', 'ASC').getMany();
    return categories.map((category) => this.formatCategoryResponse(category));
  }

  async findCategoryById(
    id: string,
    user: UserRequest,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'customFields'],
    });

    if (!category) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_005'));
    }

    return this.formatCategoryResponse(category);
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryWithCustomFieldsDto,
    user: UserRequest,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['customFields'],
    });

    if (!category) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_005'));
    }

    const { name, parentId, customFields } = updateCategoryDto;

    // Check for duplicate name if name is being updated
    if (name && name !== category.name) {
      const existingQuery = this.categoryRepository
        .createQueryBuilder('category')
        .where('LOWER(category.name) = LOWER(:name)', { name })
        .andWhere('category.id != :id', { id });

      if (parentId !== undefined) {
        if (parentId) {
          existingQuery.andWhere('category.parent.id = :parentId', {
            parentId,
          });
        } else {
          existingQuery.andWhere('category.parent.id IS NULL');
        }
      } else {
        if (category.parent) {
          existingQuery.andWhere('category.parent.id = :currentParentId', {
            currentParentId: category.parent.id,
          });
        } else {
          existingQuery.andWhere('category.parent.id IS NULL');
        }
      }

      const existingCategory = await existingQuery.getOne();
      if (existingCategory) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_002'),
        );
      }
    }
    // Validate parent category exists if provided
    if (parentId && parentId !== category.parent?.id) {
      if (parentId === id) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_006'));
      }

      const parentCategory = await this.categoryRepository.findOne({
        where: { id: parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_004'));
      }
    }

    // Check for duplicate custom field labels if provided
    if (customFields && customFields.length > 0) {
      const customFieldLabels = customFields.map((field) => field.label);
      const uniqueLabels = [...new Set(customFieldLabels)];

      if (uniqueLabels.length !== customFieldLabels.length) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_003'),
        );
      }
    }

    // Update category fields
    if (name) category.name = name;
    if (parentId !== undefined) {
      category.parent = parentId ? ({ id: parentId } as Category) : null;
    }
    // Handle custom fields if provided
    if (customFields !== undefined) {
      // Do not allow adding or removing custom fields if there is at least one OPEN, non-deleted NC for this category
      const blockingNC = await this.nonConformityRepository
        .createQueryBuilder('nc')
        .where('nc.categoryId = :categoryId', { categoryId: id })
        .andWhere('nc.deleted = :deleted', { deleted: false })
        .andWhere('nc.status = :status', { status: NCStatus.OPEN })
        .getOne();

      if (blockingNC) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_007'),
        );
      }

      const existingCustomFields = category.customFields || [];

      if (customFields === null || customFields.length === 0) {
        // Clear all custom fields
        category.customFields = [];
      } else {
        // Process custom fields: update existing ones and create new ones
        const processedCustomFields: CategoryCustomField[] = [];
        const existingCustomFields = category.customFields || [];

        for (const customFieldData of customFields) {
          // Find existing custom field with the same label
          const existingCustomField = existingCustomFields.find(
            (existing) => existing.label.toLowerCase() === customFieldData.label.toLowerCase(),
          );

          if (existingCustomField) {
            // Update existing custom field - preserve the primary key
            existingCustomField.fieldType = customFieldData.fieldType;
            existingCustomField.isRequired =
              customFieldData.isRequired || false;
            existingCustomField.options = customFieldData.options
              ? JSON.stringify(customFieldData.options)
              : null;
            existingCustomField.acceptedFiles = customFieldData.acceptedFiles
              ? JSON.stringify(customFieldData.acceptedFiles)
              : null;

            processedCustomFields.push(existingCustomField);
          } else {
            // Create new custom field
            const newCustomField = this.categoryCustomFieldRepository.create({
              categoryId: id,
              label: customFieldData.label,
              fieldType: customFieldData.fieldType,
              isRequired: customFieldData.isRequired || false,
              options: customFieldData.options
                ? JSON.stringify(customFieldData.options)
                : null,
              acceptedFiles: customFieldData.acceptedFiles
                ? JSON.stringify(customFieldData.acceptedFiles)
                : null,
            });

            processedCustomFields.push(newCustomField);
          }
        }

        // Set the processed custom fields array
        category.customFields = processedCustomFields;
      }
    }

    const updatedCategory = await this.categoryRepository.save(category);

    // Return the complete category with custom fields
    return this.findCategoryById(updatedCategory.id, user);
  }

  async deleteCategory(id: string, user: UserRequest): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children', 'customFields'],
    });
    if (!category) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_005'));
    }
    // Check if category has children
    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_008'),
      );
    }

    //check if category is used in any non-conformities
    const nonConformities = await this.nonConformityRepository.find({
      where: {
        category: { id },
        deleted: false,
      },
    });
    if (nonConformities.length > 0) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_009'),
      );
    }

    //soft delete category
    category.name = `${category.name}_DELETED_${Date.now()}`;
    category.deleted = true;
    await this.categoryRepository.save(category);
  }

  // Category Custom Field Methods
  async createCategoryCustomField(
    createDto: CreateCategoryCustomFieldDto,
    user: UserRequest,
  ): Promise<CategoryCustomFieldResponseDto> {
    const { categoryId, label } = createDto;

    // Validate category exists
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_005'));
    }

    // Check for duplicate label within same category
    const existingField = await this.categoryCustomFieldRepository.findOne({
      where: {
        categoryId,
        label: label.toLowerCase(),
      },
    });

    if (existingField) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_010'),
      );
    }

    const customField = this.categoryCustomFieldRepository.create({
      ...createDto,
      label: label.toLowerCase(),
    });

    const savedField =
      await this.categoryCustomFieldRepository.save(customField);
    return this.formatCategoryCustomFieldResponse(savedField);
  }

  async findAllCategoryCustomFields(
    user: UserRequest,
    filter?: { categoryId?: string; search?: string },
  ): Promise<CategoryCustomFieldResponseDto[]> {
    const query = this.categoryCustomFieldRepository
      .createQueryBuilder('customField')
      .leftJoinAndSelect('customField.category', 'category');

    if (filter?.categoryId) {
      query.andWhere('customField.categoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter?.search) {
      query.andWhere('customField.label LIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    const customFields = await query
      .orderBy('customField.label', 'ASC')
      .getMany();
    return customFields.map((field) =>
      this.formatCategoryCustomFieldResponse(field),
    );
  }

  async findCategoryCustomFieldById(
    id: string,
    user: UserRequest,
  ): Promise<CategoryCustomFieldResponseDto> {
    const customField = await this.categoryCustomFieldRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!customField) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_012'));
    }

    return this.formatCategoryCustomFieldResponse(customField);
  }

  async updateCategoryCustomField(
    id: string,
    updateDto: UpdateCategoryCustomFieldDto,
    user: UserRequest,
  ): Promise<CategoryCustomFieldResponseDto> {
    const customField = await this.categoryCustomFieldRepository.findOne({
      where: { id },
    });

    if (!customField) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_012'));
    }

    const { categoryId, label } = updateDto;

    // Validate category exists if categoryId is being updated
    if (categoryId && categoryId !== customField.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_005'));
      }
    }

    // Check for duplicate label if label is being updated
    if (label && label.toLowerCase() !== customField.label) {
      const existingField = await this.categoryCustomFieldRepository.findOne({
        where: {
          categoryId: categoryId || customField.categoryId,
          label: label.toLowerCase(),
          id: Not(id),
        },
      });

      if (existingField) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_010'),
        );
      }
    }

    // Update fields
    Object.assign(customField, updateDto);
    if (label) customField.label = label.toLowerCase();

    const updatedField =
      await this.categoryCustomFieldRepository.save(customField);
    return this.findCategoryCustomFieldById(updatedField.id, user);
  }

  async deleteCategoryCustomField(
    id: string,
    user: UserRequest,
  ): Promise<void> {
    const customField = await this.categoryCustomFieldRepository.findOne({
      where: { id },
      relations: ['customFieldValues'],
    });

    if (!customField) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_012'));
    }

    // Check if custom field has values
    if (
      customField.customFieldValues &&
      customField.customFieldValues.length > 0
    ) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_011'),
      );
    }

    await this.categoryCustomFieldRepository.remove(customField);
  }

  // NC Custom Field Value Methods
  async createNCCustomFieldValue(
    createDto: CreateNCCustomFieldValueDto,
    user: UserRequest,
  ): Promise<NCCustomFieldValueResponseDto> {
    const { customFieldId, ncId } = createDto;

    // Validate custom field exists
    const customField = await this.categoryCustomFieldRepository.findOne({
      where: { id: customFieldId },
    });
    if (!customField) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_012'));
    }

    // Check if value already exists for this NC and custom field
    const existingValue = await this.ncCustomFieldValueRepository.findOne({
      where: {
        customField: { id: customFieldId },
      },
    });

    if (existingValue) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_014'),
      );
    }

    const fieldValue = this.ncCustomFieldValueRepository.create({
      ...createDto,
    });

    const savedValue = await this.ncCustomFieldValueRepository.save(fieldValue);
    return this.formatNCCustomFieldValueResponse(savedValue);
  }

  async findAllNCCustomFieldValues(
    user: UserRequest,
    filter?: { ncId?: string; customFieldId?: string },
  ): Promise<NCCustomFieldValueResponseDto[]> {
    const query = this.ncCustomFieldValueRepository
      .createQueryBuilder('fieldValue')
      .leftJoinAndSelect('fieldValue.customField', 'customField')
      .leftJoinAndSelect('customField.category', 'category');

    if (filter?.ncId) {
      query.andWhere('fieldValue.ncId = :ncId', { ncId: filter.ncId });
    }

    if (filter?.customFieldId) {
      query.andWhere('fieldValue.customFieldId = :customFieldId', {
        customFieldId: filter.customFieldId,
      });
    }

    const fieldValues = await query.getMany();
    return fieldValues.map((value) =>
      this.formatNCCustomFieldValueResponse(value),
    );
  }

  async findNCCustomFieldValueById(
    id: string,
    user: UserRequest,
  ): Promise<NCCustomFieldValueResponseDto> {
    const fieldValue = await this.ncCustomFieldValueRepository.findOne({
      where: { id },
      relations: ['customField', 'customField.category'],
    });

    if (!fieldValue) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_013'));
    }

    return this.formatNCCustomFieldValueResponse(fieldValue);
  }

  async updateNCCustomFieldValue(
    id: string,
    updateDto: UpdateNCCustomFieldValueDto,
    user: UserRequest,
  ): Promise<NCCustomFieldValueResponseDto> {
    const fieldValue = await this.ncCustomFieldValueRepository.findOne({
      where: { id },
    });

    if (!fieldValue) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_013'));
    }

    const { customFieldId, ncId } = updateDto;

    // Validate custom field exists if customFieldId is being updated
    if (customFieldId && customFieldId !== fieldValue.customField.id) {
      const customField = await this.categoryCustomFieldRepository.findOne({
        where: { id: customFieldId },
      });
      if (!customField) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_012'));
      }

      // Check for duplicate value
      const existingValue = await this.ncCustomFieldValueRepository.findOne({
        where: {
          customField: { id: customFieldId },
          id: Not(id),
        },
      });

      if (existingValue) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_014'),
        );
      }
    }

    // Update fields
    Object.assign(fieldValue, updateDto);

    const updatedValue =
      await this.ncCustomFieldValueRepository.save(fieldValue);
    return this.findNCCustomFieldValueById(updatedValue.id, user);
  }

  async deleteNCCustomFieldValue(id: string, user: UserRequest): Promise<void> {
    const fieldValue = await this.ncCustomFieldValueRepository.findOne({
      where: { id },
    });

    if (!fieldValue) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_013'));
    }

    await this.ncCustomFieldValueRepository.remove(fieldValue);
  }

  // Utility Methods
  async getCustomFieldsByCategory(
    categoryId: string,
    user: UserRequest,
  ): Promise<CategoryCustomFieldResponseDto[]> {
    const customFields = await this.categoryCustomFieldRepository.find({
      where: { categoryId },
      relations: ['category'],
      order: { label: 'ASC' },
    });

    return customFields.map((field) =>
      this.formatCategoryCustomFieldResponse(field),
    );
  }

  private mapImmediateActionMessage(method: string): string {
    switch (method) {
      case 'createImmediateAction':
        return 'created an immediate action';
      case 'updateImmediateAction':
        return 'updated an immediate action';
      case 'updateImmediateActionStatus':
      case 'verifyImmediateAction':
        return 'updated an immediate action status';
      case 'deleteImmediateAction':
        return 'deleted an immediate action';
      case 'createImmediateActionEvidence':
        return 'uploaded immediate action evidence';
      case 'deleteImmediateActionEvidence':
        return 'deleted immediate action evidence';
      case 'createImmediateActionComment':
        return 'commented on an immediate action';
      case 'deleteImmediateActionComment':
        return 'deleted an immediate action comment';
      default:
        return 'modified an immediate action';
    }
  }

  private mapCaEffectivenessEvidenceMessage(method: string): string {
    switch (method) {
      case 'createCaEffectivenessEvidence':
        return 'uploaded evidence';
      case 'deleteCaEffectivenessEvidence':
        return 'deleted ca effectiveness evidence';
      default:
        return 'modified ca effectiveness evidence';
    }
  }

  // Immediate Action CRUD operations
  async createImmediateAction(
    ncId: string,
    immediateActionDto: CreateImmediateActionDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      await this.assertNcMutableById(ncId);

      // Validate assigned user exists
      const assignedTo = await this.userService.findBy({
        id: immediateActionDto.assigned_to_id,
      });
      if (!assignedTo) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_015'));
      }

      const canAssign = (
        await this.permissionService.usersWithClientAccess(
          immediateActionPermission.subject,
          [{ subject: nonConformityPermission.subject }],
          immediateActionDto.assigned_to_id,
        )
      ).length > 0;
      if (!canAssign) {
        throw new BadRequestException(
          immediateActionHttpError('IMMEDIATE_ACTION_023'),
        );
      }

      const request: CreateImmediateActionRequest = {
        parentEntityId: ncId,
        description: immediateActionDto.description,
        assigneeUserId: immediateActionDto.assigned_to_id,
        dueDate: immediateActionDto.due_date,
      };

      const result =
        await this.immediateActionCommonService.createImmediateAction(
          request,
          user,
          this.ncConfig,
          // No permission checker for NC - validation is simpler
        );

      return { id: result.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneImmediateAction(
    id: string,
    user: any,
  ): Promise<ImmediateActionResponse> {
    return await this.immediateActionCommonService.findOneImmediateAction(
      id,
      user,
      this.ncConfig,
    );
  }

  async findAllImmediateActions(
    user: any,
    nc_id: string,
    filter: any,
  ): Promise<ImmediateActionResponse[]> {
    try {
      return await this.immediateActionCommonService.getImmediateActions(
        nc_id,
        user,
        filter,
        this.ncConfig,
      );
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateImmediateAction(
    immediateActionDto: UpdateImmediateActionDto,
    user: any,
    id: string,
  ): Promise<void> {
    if (immediateActionDto.assigned_to_id) {
      const canAssign = (
        await this.permissionService.usersWithClientAccess(
          immediateActionPermission.subject,
          [{ subject: nonConformityPermission.subject }],
          immediateActionDto.assigned_to_id,
        )
      ).length > 0;
      if (!canAssign) {
        throw new BadRequestException(
          immediateActionHttpError('IMMEDIATE_ACTION_023'),
        );
      }
    }
    return await this.immediateActionCommonService.updateImmediateAction(
      id,
      {
        description: immediateActionDto.description,
        assigneeUserId: immediateActionDto.assigned_to_id,
        dueDate: immediateActionDto.due_date,
        status: immediateActionDto.status,
        rejectionExplanation: immediateActionDto.rejectionExplanation,
      },
      user,
      this.ncConfig,
      this.ncPermissionChecker,
    );
  }

  async deleteImmediateAction(id: string, user: any): Promise<void> {
    await this.immediateActionCommonService.deleteImmediateAction(
      id,
      user,
      this.ncConfig,
      this.ncPermissionChecker,
    );
  }

  async updateImmediateActionStatus(
    id: string,
    status: ImmediateActionStatus,
    user: any,
  ): Promise<void> {
    return await this.immediateActionCommonService.updateImmediateAction(
      id,
      { status },
      user,
      this.ncConfig,
      this.ncPermissionChecker,
    );
  }

  // Evidence CRUD operations
  async createCaEffectivenessEvidence(
    user: any,
    caId: string,
    file: any,
  ): Promise<void> {
    const queryRunner =
      this.nonConformityRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ca = await this.ncCorrectiveActionRepository.findOne({
        where: {
          id: caId,
          status: NCCorrectiveActionStatus.OPEN,
          deleted: false,
        },
      });
      if (!ca) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_016'));
      }

      await this.assertNcMutableById(ca.nonConformityId);

      //check that user that is callng this method is the assignee of the corrective action
      // if (ca.assignedToId !== user.id) {
      //   throw new BadRequestException('User is not the assignee of the corrective action');
      // }

      if (file) {
        const uploadedFile = await this.fileService.uploadFile(file);
        const newEvidence = this.caEffectivenessEvidenceRepository.create({
          caId: caId, // Ensure caId is set directly
          ca: { id: caId } as NCCorrectiveAction,
          fileUrl: uploadedFile,
          uploadedBy: { id: user.id } as any,
          uploadedById: user.id,
          uploadedAt: Date.now(),
        });
        await this.caEffectivenessEvidenceRepository.save(newEvidence);
      }
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  // async findAllEvidence(
  //   user: any,
  //   filter: any,
  // ): Promise<EvidenceResponseDTO[]> {
  //   try {
  //     const query = this.evidenceRepository
  //       .createQueryBuilder('evidence')
  //       .leftJoinAndSelect('evidence.uploadedBy', 'uploadedBy')
  //       .leftJoinAndSelect('evidence.nc', 'nc');

  //     });

  //     if (filter.search) {
  //       query.andWhere('LOWER(evidence.fileUrl) LIKE LOWER(:search)', {
  //         search: `%${filter.search}%`,
  //       });
  //     }

  //     if (filter.uploaded_by_id) {
  //       query.andWhere('evidence.uploadedBy.id = :uploadedById', {
  //         uploadedById: filter.uploaded_by_id,
  //       });
  //     }

  //     if (filter.nc_id) {
  //       query.andWhere('evidence.nc.id = :ncId', {
  //         ncId: filter.nc_id,
  //       });
  //     }

  //     const evidence = await query.getMany();
  //     return evidence.map((ev) => this.formatEvidenceEntity(ev));
  //   } catch (error: any) {
  //     this.logger.error(error);
  //     this.throwNcCatalogOrRethrowHttp(error);
  //   }
  // }

  // async findOneEvidence(id: string, user: any): Promise<EvidenceResponseDTO> {
  //   try {
  //     const evidence = await this.evidenceRepository.findOne({
  //       where: {
  //         id,
  //       },
  //       relations: ['uploadedBy', 'nc'],
  //     });

  //     if (!evidence) {
  //       throw new BadRequestException('Evidence not found');
  //     }

  //     return this.formatEvidenceEntity(evidence);
  //   } catch (error: any) {
  //     this.logger.error(error);
  //     this.throwNcCatalogOrRethrowHttp(error);
  //   }
  // }

  // async deleteEvidence(id: string, user: any): Promise<void> {
  //   try {
  //     const evidence = await this.evidenceRepository.findOne({
  //       where: {
  //         id,
  //       },
  //     });

  //     if (!evidence) {
  //       throw new BadRequestException('Evidence not found');
  //     }

  //     await this.evidenceRepository.remove(evidence);
  //   } catch (error: any) {
  //     this.logger.error(error);
  //     this.throwNcCatalogOrRethrowHttp(error);
  //   }
  // }

  private mapNonConformityMessage(method: string): string {
    switch (method) {
      case 'createNonConformity':
        return 'created a non-conformity';
      case 'updateNonConformity':
        return 'updated a non-conformity';
      case 'deleteNonConformity':
        return 'deleted a non-conformity';
      default:
        return 'modified a non-conformity';
    }
  }

  private mapNonConformityRepresentativeMessage(method: string): string {
    switch (method) {
      case 'createNonConformityRepresentative':
        return 'created a non-conformity representative';
      case 'updateNonConformityRepresentative':
        return 'updated a non-conformity representative';
      case 'deleteNonConformityRepresentative':
        return 'deleted a non-conformity representative';
      default:
        return 'modified a non-conformity representative';
    }
  }

  // async getValuesByNonConformity(
  //   ncId: string,
  //   user: UserRequest,
  // ): Promise<NCCustomFieldValueResponseDto[]> {
  //   const values = await this.ncCustomFieldValueRepository.find({
  //     relations: ['customField', 'customField.category'],
  //   });

  //   return values.map((value) => this.formatNCCustomFieldValueResponse(value));
  // }

  // Format Response Methods
  private formatCategoryResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      createdBy: category.createdBy
        ? {
            id: category.createdBy.id,
            fname: category.createdBy.fname,
            lname: category.createdBy.lname,
            email: category.createdBy.email,
          }
        : undefined,
      parentId: category.parent?.id,
      parent: category.parent
        ? this.formatCategoryResponse(category.parent)
        : undefined,
      children: category.children?.map((child) =>
        this.formatCategoryResponse(child),
      ),
      customFields: category.customFields?.map((field) =>
        this.formatCategoryCustomFieldResponse(field),
      ),
    };
  }

  private formatCategoryCustomFieldResponse(
    field: CategoryCustomField,
  ): CategoryCustomFieldResponseDto {
    return {
      id: field.id,
      categoryId: field.categoryId,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options ? JSON.parse(field.options) : null,
      acceptedFiles: field.acceptedFiles
        ? JSON.parse(field.acceptedFiles)
        : null,
      category: field.category
        ? this.formatCategoryResponse(field.category)
        : undefined,
    };
  }

  private formatNCCustomFieldValueResponse(
    value: NCCustomFieldValue,
  ): NCCustomFieldValueResponseDto {
    return {
      id: value.id,
      // ncId: value.ncId,
      customFieldId: value.customField.id,
      value: value.value,
      customField: value.customField
        ? this.formatCategoryCustomFieldResponse(value.customField)
        : undefined,
    };
  }

  // Non-conformity Type Methods
  async createNonConformityType(
    nonConformityTypeDto: CreateNonConformityTypeDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      const nonConformityType = await this.nonConformityTypeRepository
        .createQueryBuilder('nonConformityType')
        .andWhere('LOWER(nonConformityType.name) = LOWER(:name)', {
          name: nonConformityTypeDto.name,
        })
        .andWhere('nonConformityType.deleted = :deleted', {
          deleted: false,
        })
        .getOne();

      if (nonConformityType) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_017'));
      }

      const newNonConformityType = this.nonConformityTypeRepository.create({
        ...nonConformityTypeDto,
        createdBy: { id: user.id } as any,
      });
      await this.nonConformityTypeRepository.save(newNonConformityType);
      return { id: newNonConformityType.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllNonConformityTypes(
    user: any,
    filter: any,
  ): Promise<NonConformityTypeResponseDTO[]> {
    try {
      const query = this.nonConformityTypeRepository
        .createQueryBuilder('nonConformityType')
        .select([
          'nonConformityType.id',
          'nonConformityType.name',
          'nonConformityType.description',
        ]);
      query.where('nonConformityType.deleted = :deleted', {
        deleted: false,
      });

      if (filter.name) {
        query.andWhere('LOWER(nonConformityType.name) LIKE LOWER(:name)', {
          name: `%${filter.name}%`,
        });
      }

      return query.getMany();
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneNonConformityType(
    id: string,
    user: any,
  ): Promise<NonConformityTypeResponseDTO> {
    try {
      const nonConformityType = await this.nonConformityTypeRepository.findOne({
        where: {
          id,
          deleted: false,
        },
      });
      if (!nonConformityType) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_018'));
      }
      return this.formatNonConformityTypeEntity(nonConformityType);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateNonConformityType(
    nonConformityTypeDto: UpdateNonConformityTypeDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      const nonConformityType = await this.findOneNonConformityType(
        nonConformityTypeDto.id,
        user,
      );
      if (!nonConformityType) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_018'));
      }


      if (nonConformityTypeDto.name) {
        const existingNonConformityType = await this.nonConformityTypeRepository
          .createQueryBuilder('nonConformityType')
          .andWhere('nonConformityType.id != :id', {
            id: nonConformityType.id,
          })
          .andWhere('LOWER(nonConformityType.name) = LOWER(:name)', {
            name: nonConformityTypeDto.name,
          })
          .andWhere('nonConformityType.deleted = :deleted', {
            deleted: false,
          })
          .getOne();
        if (existingNonConformityType) {
  throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_017'));
        }
      }

      await this.nonConformityTypeRepository.update(nonConformityType.id, {
        ...nonConformityTypeDto,
      });
      return { id: nonConformityType.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteNonConformityType(id: string, user: any): Promise<{ id: string }> {
    try {
      const nonConformityType = await this.nonConformityTypeRepository.findOne({
        where: {
          id,
          deleted: false,
        },
      });
      if (!nonConformityType) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_018'));
      }

      const blockingNC = await this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .where('nonConformity.nonConformityType = :typeId', {
          typeId: nonConformityType.id,
        })
        .andWhere('nonConformity.deleted = false')
        .getOne();
      if (blockingNC) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_019'),
        );
      }

      nonConformityType.name = `${nonConformityType.name}_DELETED_${Date.now()}`;
      nonConformityType.deleted = true;
      await this.nonConformityTypeRepository.save(nonConformityType);
      return { id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async bulkCreateNonConformityRiskLevel(
    bulkCreateRiskLevelDto: BulkCreateNonConformityRiskLevelDto,
    user: any,
  ): Promise<NonConformityRiskLevelResponseDTO[]> {
    const { riskLevels } = bulkCreateRiskLevelDto;
    if (!riskLevels || !Array.isArray(riskLevels) || riskLevels.length === 0) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_020'),
      );
    }

    const queryRunner =
      this.nonConformityRiskLevelRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if any of the risk levels payload have the same name, order, or id if so throw an error
      const names = new Set<string>();
      const orders = new Set<number>();
      const ids = new Set<string>();

      for (const riskLevelData of riskLevels) {
        // Check for duplicate names (case-insensitive)
        const normalizedName = riskLevelData.name?.toLowerCase().trim();
        if (normalizedName) {
          if (names.has(normalizedName)) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_021', {
                params: { name: String(riskLevelData.name) },
              }),
            );
          }
          names.add(normalizedName);
        }

        // Check for duplicate orders
        if (riskLevelData.order !== undefined && riskLevelData.order !== null) {
          if (orders.has(riskLevelData.order)) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_022', {
                params: { order: String(riskLevelData.order) },
              }),
            );
          }
          orders.add(riskLevelData.order);
        }

        // Check for duplicate IDs
        if (riskLevelData.id) {
          if (ids.has(riskLevelData.id)) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_023', {
                params: { id: String(riskLevelData.id) },
              }),
            );
          }
          ids.add(riskLevelData.id);
        }
      }

      // Separate updates and creations
      const toUpdate: NonConformityRiskLevel[] = [];
      const toCreate: Partial<NonConformityRiskLevel>[] = [];

      // Collect all existing risk levels that need to be updated
      const existingIds = riskLevels.filter((r) => r.id).map((r) => r.id);
      const existingRiskLevels =
        existingIds.length > 0
          ? await queryRunner.manager.find(NonConformityRiskLevel, {
              where: {
                id: In(existingIds),
                deleted: false,
              },
            })
          : [];

      // Create a map for quick lookup
      const existingMap = new Map(existingRiskLevels.map((r) => [r.id, r]));

      for (const riskLevelData of riskLevels) {
        if (riskLevelData.id) {
          const existingRiskLevel = existingMap.get(riskLevelData.id);
          if (!existingRiskLevel) {
            throw new NotFoundException(
              nonConformityHttpError('NON_CONFORMITY_024', {
                params: { id: String(riskLevelData.id) },
              }),
            );
          }

          // Check if this risk level has any open non-conformities before allowing update
          const blockingNC = await queryRunner.manager
            .createQueryBuilder(NonConformity, 'nonConformity')
            .where('nonConformity.nonConformityRiskLevel = :riskLevelId', {
              riskLevelId: existingRiskLevel.id,
            })
            .andWhere('nonConformity.deleted = false')
            .andWhere('(nonConformity.status = :open)', { open: NCStatus.OPEN })
            .getOne();

          if (blockingNC) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_025', {
                params: { name: existingRiskLevel.name },
              }),
            );
          }

          // Update the risk level fields
          Object.assign(existingRiskLevel, {
            name: riskLevelData.name,
            description: riskLevelData.description,
            order: riskLevelData.order,
          });

          toUpdate.push(existingRiskLevel);
        } else {
          // Prepare new risk level for creation
          toCreate.push({
            name: riskLevelData.name,
            description: riskLevelData.description,
            order: riskLevelData.order,
            createdBy: { id: user.id } as any,
          });
        }
      }

      // Perform bulk operations
      const results: NonConformityRiskLevel[] = [];

      // Bulk update existing risk levels
      if (toUpdate.length > 0) {
        const updatedRiskLevels = await queryRunner.manager.save(
          NonConformityRiskLevel,
          toUpdate,
        );
        results.push(...updatedRiskLevels);
      }

      // Bulk create new risk levels
      if (toCreate.length > 0) {
        const newRiskLevels = await queryRunner.manager.save(
          NonConformityRiskLevel,
          toCreate,
        );
        results.push(...newRiskLevels);
      }

      await queryRunner.commitTransaction();

      // Return formatted results
      return results.map((riskLevel) =>
        this.formatNonConformityRiskLevelEntity(riskLevel),
      );
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.throwNcCatalogOrRethrowHttp(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllNonConformityRiskLevels(
    user: any,
    filter: any,
  ): Promise<NonConformityRiskLevelResponseDTO[]> {
    try {
      await this.ensureDefaultRiskLevels();
      const query = this.nonConformityRiskLevelRepository
        .createQueryBuilder('nonConformityRiskLevel')
        .select([
          'nonConformityRiskLevel.id',
          'nonConformityRiskLevel.name',
          'nonConformityRiskLevel.description',
          'nonConformityRiskLevel.order',
        ]);
      query.where('nonConformityRiskLevel.deleted = :deleted', {
        deleted: false,
      });

      if (filter.name) {
        query.andWhere('LOWER(nonConformityRiskLevel.name) LIKE LOWER(:name)', {
          name: `%${filter.name}%`,
        });
      }
      query.orderBy('nonConformityRiskLevel.order', 'ASC');
      return query.getMany();
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneNonConformityRiskLevel(
    id: string,
    user: any,
  ): Promise<NonConformityRiskLevelResponseDTO> {
    try {
      const nonConformityRiskLevel =
        await this.nonConformityRiskLevelRepository.findOne({
          where: {
            id,
            deleted: false,
          },
        });
      if (!nonConformityRiskLevel) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_027'));
      }
      return this.formatNonConformityRiskLevelEntity(nonConformityRiskLevel);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteNonConformityRiskLevel(id: string, user: any): Promise<void> {
    try {
      const nonConformityRiskLevel =
        await this.nonConformityRiskLevelRepository.findOne({
          where: {
            id,
            deleted: false,
          },
        });
      if (!nonConformityRiskLevel) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_027'));
      }

      const blockingNC = await this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .where('nonConformity.nonConformityRiskLevel = :riskLevelId', {
          riskLevelId: nonConformityRiskLevel.id,
        })
        .andWhere('nonConformity.deleted = false')
        .getOne();
      if (blockingNC) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_026'),
        );
      }

      const deletedOrder = nonConformityRiskLevel.order;

      nonConformityRiskLevel.name = `${nonConformityRiskLevel.name}_DELETED_${Date.now()}`;
      nonConformityRiskLevel.deleted = true;
      await this.nonConformityRiskLevelRepository.save(nonConformityRiskLevel);

      // Reorder remaining risk levels by shifting down orders that were higher than the deleted one
      await this.nonConformityRiskLevelRepository
        .createQueryBuilder()
        .update(NonConformityRiskLevel)
        .set({ order: () => '`order` - 1' })
        .andWhere('`order` > :deletedOrder', { deletedOrder })
        .andWhere('deleted = false')
        .execute();
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  private formatNonConformityTypeEntity(
    entity: NonConformityType,
  ): NonConformityTypeResponseDTO {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
    };
  }

  private formatNonConformityRiskLevelEntity(
    entity: NonConformityRiskLevel,
  ): NonConformityRiskLevelResponseDTO {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      order: entity.order,
    };
  }

  private async resolveTeamOwnerUserId(teamId: number): Promise<string> {
    const adminMember = await this.teamMemberRepository
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.user', 'user')
      .innerJoin('member.role', 'role')
      .where('member.teamId = :teamId', { teamId })
      .andWhere('role.name = :adminName', { adminName: 'Admin' })
      .andWhere('user.deleted = false')
      .getOne();
    if (adminMember?.user?.id) {
      return adminMember.user.id;
    }

    const member = await this.teamMemberRepository.findOne({
      where: { teamId },
      relations: ['user'],
    });
    if (!member?.user?.id) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_028'),
      );
    }
    return member.user.id;
  }

  private async resolveNonConformityRepresentativePayload(params: {
    representativeId?: string | null;
    representativeType?: string | null;
    teamId: number;
    legacyInferExternalWhenIdWithoutType: boolean;
  }): Promise<{
    representativeType: NCREPRESENTATIVETYPE;
    representativeId: string | null;
    internalRepresentativeId: string | null;
  }> {
    const repId =
      params.representativeId && String(params.representativeId).trim()
        ? String(params.representativeId).trim()
        : null;
    const repType = (params.representativeType || '')
      .toUpperCase()
      .trim();

    if (repId && repType === 'INTERNAL') {
      const u = await this.userRepository.findOne({
        where: {
          id: repId,
          deleted: false,
          isActive: true,
        },
      });
      if (!u) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_029'),
        );
      }
      return {
        representativeType: NCREPRESENTATIVETYPE.INTERNAL,
        representativeId: null,
        internalRepresentativeId: repId,
      };
    }

    if (repId && repType === 'EXTERNAL') {
      const representative =
        await this.nonConformityRepresentativeRepository.findOne({
          where: {
            id: repId,
            deleted: false,
          },
        });
      if (!representative) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_030'),
        );
      }
      return {
        representativeType: NCREPRESENTATIVETYPE.EXTERNAL,
        representativeId: repId,
        internalRepresentativeId: null,
      };
    }

    if (
      repId &&
      !repType &&
      params.legacyInferExternalWhenIdWithoutType
    ) {
      const representative =
        await this.nonConformityRepresentativeRepository.findOne({
          where: {
            id: repId,
            deleted: false,
          },
        });
      if (!representative) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_031'));
      }
      return {
        representativeType: NCREPRESENTATIVETYPE.EXTERNAL,
        representativeId: repId,
        internalRepresentativeId: null,
      };
    }

    if (repId) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_032'),
      );
    }

    const ownerId = await this.resolveTeamOwnerUserId(params.teamId);
    return {
      representativeType: NCREPRESENTATIVETYPE.INTERNAL,
      representativeId: null,
      internalRepresentativeId: ownerId,
    };
  }

  //non conformity methods
  async createNonConformity(
    nonConformityDto: CreateNonConformityDto,
    user: any,
    files?: any[],
    fieldFiles?: any[],
  ): Promise<{ id: string }> {
    const queryRunner =
      this.nonConformityRepository.manager.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {

      await this.assertTeamAccess(user, nonConformityDto.teamId, 'create');

      const nonConformityType = await this.nonConformityTypeRepository.findOne({
        where: {
          id: nonConformityDto.nonConformityTypeId,
          deleted: false,
        },
      });
      if (!nonConformityType) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_018'));
      }

      const nonConformityRiskLevel =
        await this.nonConformityRiskLevelRepository.findOne({
          where: {
            id: nonConformityDto.nonConformityRiskLevelId,
            deleted: false,
          },
        });
      if (!nonConformityRiskLevel) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_027'));
      }

      const category = await this.categoryRepository.findOne({
        where: {
          id: nonConformityDto.categoryId,
          deleted: false,
        },
      });
      if (!category) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_005'));
      }

      if (!nonConformityDto.problemStatement) {
throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_034'));
      }

      const repPayload = await this.resolveNonConformityRepresentativePayload({
        representativeId: nonConformityDto.representativeId,
        representativeType: nonConformityDto.representativeType,
        teamId: nonConformityDto.teamId,
        legacyInferExternalWhenIdWithoutType: true,
      });

      const newNonConformity = new NonConformity();
      const count = await this.nonConformityRepository
        .createQueryBuilder('nc')
        .getCount();
      newNonConformity.name = `NC-${count + 1}`;
      newNonConformity.team = {
        id: nonConformityDto.teamId,
      } as any;
      newNonConformity.teamId = nonConformityDto.teamId;
      newNonConformity.representativeType = repPayload.representativeType;
      newNonConformity.representativeId = repPayload.representativeId;
      newNonConformity.representative = repPayload.representativeId
        ? ({ id: repPayload.representativeId } as NonConformityRepresentative)
        : null;
      newNonConformity.internalRepresentativeId =
        repPayload.internalRepresentativeId;
      newNonConformity.internalRepresentative =
        repPayload.internalRepresentativeId
          ? ({ id: repPayload.internalRepresentativeId } as User)
          : null;
      if (nonConformityDto.responsibleUserId) {
        await this.assertResponsibleUserBelongsToTeam(nonConformityDto.responsibleUserId, nonConformityDto.teamId);
        newNonConformity.responsibleUser = {
          id: nonConformityDto.responsibleUserId,
        } as any;
        newNonConformity.responsibleUserId = nonConformityDto.responsibleUserId;
      }
      newNonConformity.nonConformityType = nonConformityType;
      newNonConformity.nonConformityTypeId = nonConformityType.id;
      newNonConformity.nonConformityRiskLevel = nonConformityRiskLevel;
      newNonConformity.nonConformityRiskLevelId = nonConformityRiskLevel.id;
      newNonConformity.category = category;
      newNonConformity.categoryId = category.id;
      newNonConformity.createdBy = { id: user.id } as any;
      newNonConformity.createdAt = Date.now();
      newNonConformity.dateReported = new Date(
        nonConformityDto.dateReported,
      ).valueOf();
      newNonConformity.dueDate = new Date(nonConformityDto.dueDate).valueOf();
      newNonConformity.problemStatement = nonConformityDto.problemStatement;
      newNonConformity.objectiveEvidence = nonConformityDto.objectiveEvidence;
      newNonConformity.requirements = nonConformityDto.requirements;
      newNonConformity.status = NCStatus.OPEN;
      newNonConformity.needsInvestigation =
        typeof nonConformityDto.needsInvestigation === 'string'
          ? nonConformityDto.needsInvestigation === 'true'
          : nonConformityDto.needsInvestigation === true;

      if (files && files.length > 0) {
        try {
          const uploadedFiles = await Promise.all(
            files.map((file) => this.fileService.uploadFile(file)),
          );

          newNonConformity.evidenceFiles = [
            ...(newNonConformity.evidenceFiles || []),
            ...uploadedFiles,
          ];
        } catch (error: any) {
          this.logger.error(`S3 upload failed: ${error.message}`);
        }
      }

      const customFieldValues: NCCustomFieldValue[] = [];
      const fileFieldIdSet = new Set(nonConformityDto.uuids || []);
      if (
        fieldFiles &&
        fieldFiles.length > 0 &&
        nonConformityDto.uuids &&
        nonConformityDto.uuids.length > 0
      ) {
        try {
          const uploadedFieldFiles = await Promise.all(
            fieldFiles.map((file) =>
              this.fileService.uploadFile(file),
            ),
          );
          for (let i = 0; i < nonConformityDto.uuids.length; i++) {
            const customFieldId = nonConformityDto.uuids[i];
            const uploadedFile = uploadedFieldFiles[i];
            if (uploadedFile) {
              customFieldValues.push(
                this.ncCustomFieldValueRepository.create({
                  customField: { id: customFieldId },
                  value: uploadedFile,
                }),
              );
            }
          }
        } catch (error: any) {
          this.logger.error(
            `S3 upload failed for custom field files: ${error.message}`,
          );
        }
      }
      if (nonConformityDto.customFieldValues) {
        let customFieldValuesArray: any[] = [];
        if (typeof nonConformityDto.customFieldValues === 'string') {
          try {
            customFieldValuesArray = JSON.parse(
              nonConformityDto.customFieldValues,
            );
          } catch (e) {
            throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_035'));
          }
        } else if (Array.isArray(nonConformityDto.customFieldValues)) {
          customFieldValuesArray = nonConformityDto.customFieldValues;
        }
        for (const fieldValue of customFieldValuesArray) {
          if (fileFieldIdSet.has(fieldValue.customFieldId)) continue;
          const valueToSave =
            typeof fieldValue.value === 'object'
              ? JSON.stringify(fieldValue.value)
              : String(fieldValue.value ?? '');
          customFieldValues.push(
            this.ncCustomFieldValueRepository.create({
              customField: { id: fieldValue.customFieldId },
              value: valueToSave,
            }),
          );
        }
      }

      newNonConformity.customFieldValues = customFieldValues;
      await this.applyAuditAssignment(
        queryRunner.manager,
        newNonConformity,
        nonConformityDto,
      );
      await queryRunner.manager.save(newNonConformity);
      if (newNonConformity.findingId) {
        await this.bindFindingToNonConformity(
          queryRunner.manager,
          newNonConformity.id,
          newNonConformity.findingId,
        );
      }
      await queryRunner.commitTransaction();

      return { id: newNonConformity.id };
    } catch (error: any) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to create non-conformity: ${error.message}`);
      this.throwNcCatalogOrRethrowHttp(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllNonConformities(
    user: any,
    filter: any,
  ): Promise<NonConformity[]> {
    try {
      const query = this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .leftJoin('nonConformity.team', 'team')
        .leftJoin(
          'nonConformity.nonConformityRiskLevel',
          'nonConformityRiskLevel',
        )
        .leftJoin('nonConformity.nonConformityType', 'nonConformityType')
        .leftJoin('nonConformity.category', 'category')
        .leftJoin('nonConformity.auditFinding', 'auditFinding')
        .leftJoin('nonConformity.createdBy', 'createdBy')
        .leftJoin('nonConformity.responsibleUser', 'responsibleUser')
        .select([
          'nonConformity.id',
          'nonConformity.name',
          'nonConformity.dueDate',
          'nonConformity.problemStatement',
          'nonConformity.status',
          'nonConformity.responsibleUserId',
          'team.id',
          'team.name',
          'nonConformityRiskLevel.name',
          'nonConformityType.name',
          'category.name',
          'createdBy.id',
          'createdBy.fname',
          'createdBy.lname',
          'responsibleUser.id',
          'responsibleUser.fname',
          'responsibleUser.lname',
        ])
        .andWhere('team.id IN (:...teamIds)', {
          teamIds: this.accessibleTeamIds(user),
        })
        .andWhere('nonConformity.deleted = :deleted', {
          deleted: false,
        });

      if (filter?.unlinked === 'true' || filter?.unlinked === true) {
        query.andWhere('auditFinding.id IS NULL');
      }

      if (filter.status === 'OVERDUE') {
        query
          .andWhere('nonConformity.status = :openStatus', {
            openStatus: NCStatus.OPEN,
          })
          .andWhere('nonConformity.dueDate < :startOfToday', {
            startOfToday: getLocalStartOfDay(Date.now()),
          });
      } else if (filter.status === NCStatus.OPEN) {
        query
          .andWhere('nonConformity.status = :status', {
            status: NCStatus.OPEN,
          })
          .andWhere('nonConformity.dueDate >= :startOfToday', {
            startOfToday: getLocalStartOfDay(Date.now()),
          });
      } else if (filter.status) {
        query.andWhere('nonConformity.status = :status', {
          status: filter.status,
        });
      }

      if (filter.teamId) {
        query.andWhere(
          'nonConformity.teamId = :teamId',
          {
            teamId: filter.teamId,
          },
        );
      }


      if (filter.nonConformityTypeId) {
        query.andWhere(
          'nonConformity.nonConformityTypeId = :nonConformityTypeId',
          {
            nonConformityTypeId: filter.nonConformityTypeId,
          },
        );
      }

      if (filter.nonConformityRiskLevelId) {
        query.andWhere(
          'nonConformity.nonConformityRiskLevelId = :nonConformityRiskLevelId',
          {
            nonConformityRiskLevelId: filter.nonConformityRiskLevelId,
          },
        );
      }

      if (filter.categoryId) {
        query.andWhere('nonConformity.categoryId = :categoryId', {
          categoryId: filter.categoryId,
        });
      }

      if (filter.search) {
        query.andWhere(
          '(LOWER(nonConformity.problemStatement) LIKE :search OR LOWER(nonConformity.name) LIKE :search)',
          {
            search: `%${filter.search.toLowerCase()}%`,
          },
        );
      }


      // Sorting
      const sortMap: Record<string, string> = {
        dueDate: 'nonConformity.dueDate',
        createdAt: 'nonConformity.createdAt',
      };
      const sortByKey = filter?.sortBy as string | undefined;
      const sortDirRaw = (filter?.sortDir as string | undefined) || 'desc';
      const sortColumn =
        sortByKey && sortMap[sortByKey]
          ? sortMap[sortByKey]
          : 'nonConformity.createdAt';
      const sortDirection =
        sortDirRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query.orderBy(sortColumn, sortDirection as 'ASC' | 'DESC');
      const nonConformities = await query.getMany();
      return nonConformities.map((nc) => ({
        ...nc,
        isOverdue: this.isNcOverdue(nc),
      }));
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneNonConformity(
    id: string,
    user: any,
  ): Promise<NonConformityResponseDTO> {
    try {
      const query = this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .leftJoin('nonConformity.team', 'team')
        .leftJoin('nonConformity.category', 'category')
        .leftJoin(
          'nonConformity.nonConformityRiskLevel',
          'nonConformityRiskLevel',
        )
        .leftJoin('nonConformity.nonConformityType', 'nonConformityType')
        .leftJoin('nonConformity.representative', 'representative')
        .leftJoin('nonConformity.internalRepresentative', 'internalRepresentative')
        .leftJoin('nonConformity.createdBy', 'createdBy')
        .leftJoin('nonConformity.responsibleUser', 'responsibleUser')
        .leftJoin('nonConformity.finding', 'finding')
        .leftJoin('finding.auditInstance', 'auditInstance')
        .leftJoin('nonConformity.customFieldValues', 'customFieldValues')
        .leftJoin('customFieldValues.customField', 'customField')
        .leftJoinAndSelect(
          'nonConformity.correctiveActions',
          'correctiveActions',
          'correctiveActions.deleted = :caDeleted',
          { caDeleted: false },
        )
        .leftJoinAndSelect('correctiveActions.assignedTo', 'assignedTo')
        .leftJoinAndSelect('correctiveActions.createdBy', 'caCreatedBy')
        .select([
          'nonConformity.id',
          'nonConformity.name',
          'nonConformity.teamId',
          'nonConformity.nonConformityRiskLevelId',
          'nonConformity.nonConformityTypeId',
          'team.name',
          'nonConformity.createdAt',
          'team.id',
          'category.name',
          'nonConformityType.name',
          'nonConformityRiskLevel.name',
          'nonConformity.representativeId',
          'nonConformity.representativeType',
          'nonConformity.internalRepresentativeId',
          'representative.id',
          'representative.firstName',
          'representative.lastName',
          'representative.email',
          'internalRepresentative.id',
          'internalRepresentative.fname',
          'internalRepresentative.lname',
          'internalRepresentative.email',
          'nonConformity.categoryId',
          'nonConformity.dateReported',
          'nonConformity.dueDate',
          'nonConformity.problemStatement',
          'nonConformity.status',
          'nonConformity.objectiveEvidence',
          'nonConformity.requirements',
          'nonConformity.evidenceFiles',
          'nonConformity.closingComment',
          'nonConformity.needsInvestigation',
          'nonConformity.responsibleUserId',
          'nonConformity.findingId',
          'nonConformity.auditId',
          'finding.id',
          'finding.title',
          'auditInstance.id',
          'auditInstance.auditId',
          'auditInstance.auditProgramId',
          'createdBy.id',
          'createdBy.fname',
          'createdBy.lname',
          'responsibleUser.id',
          'responsibleUser.fname',
          'responsibleUser.lname',
          'responsibleUser.email',
          'customFieldValues.id',
          'customFieldValues.value',
          'customField.id',
          'customField.label',
          'customField.fieldType',
          'customField.isRequired',
          'customField.options',
          'customField.acceptedFiles',
          'correctiveActions.id',
          'correctiveActions.title',
          'correctiveActions.description',
          'correctiveActions.priority',
          'correctiveActions.dueDate',
          'correctiveActions.status',
          'correctiveActions.deleted',
          'correctiveActions.createdById',
          'assignedTo.id',
          'assignedTo.fname',
          'assignedTo.lname',
          'caCreatedBy.id',
          'caCreatedBy.fname',
          'caCreatedBy.lname',
        ])
        .andWhere('team.id IN (:...teamIds)', {
          teamIds: this.accessibleTeamIds(user),
        })
        .andWhere('nonConformity.id = :id', { id })
        .andWhere('nonConformity.deleted = :deleted', {
          deleted: false,
        });

      const nonConformity = await query.getOne();
      if (!nonConformity) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      const dueDateAmendments = await this.ncDueDateAmendmentRepository.find({
        where: { nonConformityId: nonConformity.id },
        relations: ['amendedBy'],
        order: { amendedAt: 'DESC' },
      });

      return {
        ...nonConformity,
        isOverdue: this.isNcOverdue(nonConformity),
        dueDateAmendments: this.mapDueDateAmendments(dueDateAmendments),
      } as NonConformityResponseDTO;
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async closeNonConformity(
    ncId: string,
    dto: CloseNonConformityDto,
    user: any,
    evidenceFiles?: any[],
  ): Promise<void> {
    const queryRunner =
      this.nonConformityRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let removedFiles = dto.removedFiles;
      if (Array.isArray(removedFiles)) {
        removedFiles = removedFiles.map((e) =>
          typeof e === 'string' ? JSON.parse(e) : e,
        );
      }

      const query = this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .leftJoinAndSelect('nonConformity.team', 'team')
        .leftJoinAndSelect(
          'nonConformity.nonConformityRiskLevel',
          'nonConformityRiskLevel',
        )
        .leftJoinAndSelect(
          'nonConformity.nonConformityType',
          'nonConformityType',
        )
        .leftJoinAndSelect('nonConformity.representative', 'representative')
        .andWhere('team.id IN (:...teamIds)', {
          teamIds: this.accessibleTeamIds(user),
        })
        .andWhere('nonConformity.id = :id', { id: ncId })
        .andWhere('nonConformity.deleted = :deleted', {
          deleted: false,
        });

      const nonConformity = await query.getOne();

      if (!nonConformity) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      this.assertNcMutable(nonConformity);

      const needsInvestigation =
        dto.needsInvestigation !== undefined
          ? typeof dto.needsInvestigation === 'string'
            ? dto.needsInvestigation === 'true'
            : dto.needsInvestigation === true
          : nonConformity.needsInvestigation;

      const immediateActions =
        await this.immediateActionCommonService.getImmediateActions(
          nonConformity.id,
          user,
          {},
          this.ncConfig,
        );
      const openImmediateActions = immediateActions.filter(
        (action) => action.status !== ImmediateActionStatus.VERIFIED,
      );
      if (openImmediateActions.length > 0) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_038'),
        );
      }

      const investigations = await this.findAllInvestigations(
        nonConformity.id,
        user,
      );

      if (needsInvestigation && investigations.length == 0) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_039'),
        );
      }

      if (investigations.length > 0) {
        const investigation = investigations[0];
        if (investigation.action == InvestigationAction.OPEN_RCA) {
          const rootCauseAnalyses = await this.findAllRootCauseAnalysis(
            nonConformity.id,
            user,
          );
          if (rootCauseAnalyses.length == 0) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_040'),
            );
          }
          const rca = rootCauseAnalyses[0];

          let rcaDataFilled = false;

          if (rca.method === 'FiveWhys') {
            const fiveWhySteps = await this.findAllRCAFiveWhySteps(
              user,
              rca.id,
            );
            rcaDataFilled =
              fiveWhySteps.length > 0 &&
              fiveWhySteps.every(
                (step) =>
                  step.whyQuestion &&
                  step.whyQuestion.trim() !== '' &&
                  step.becauseAnswer &&
                  step.becauseAnswer.trim() !== '',
              );
          } else if (rca.method === 'CauseEffect') {
            const ceCategories = await this.findAllRCACeCategory(
              nonConformity.id,
              user,
            );
            rcaDataFilled =
              ceCategories.length > 0 &&
              ceCategories.some(
                (category) =>
                  category.causes &&
                  category.causes.length > 0 &&
                  category.causes.some(
                    (cause) => cause.text && cause.text.trim() !== '',
                  ),
              );
          } else if (rca.method === 'Fishbone') {
            const fishbone = await this.rcaFishboneRepository.findOne({
              where: { rootCauseAnalysisId: rca.id },
            });
            if (!fishbone) {
              rcaDataFilled = false;
            } else {
              const categories = await this.rcaCeCategoryRepository.find({
                where: { rootCauseAnalysisId: rca.id, deleted: false },
                relations: ['rcaCeCauses'],
                order: { displayOrder: 'ASC' },
              });
              const hasAnyCause = categories.some((category) =>
                category.rcaCeCauses?.some(
                  (cause) => cause.text?.trim() !== '',
                ),
              );
              rcaDataFilled = !!fishbone.effectStatement && hasAnyCause;
            }
          }

          if (!rcaDataFilled) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_041'),
            );
          }

          const correctiveActions = await this.findAllCorrectiveActions(user, {
            nonConformityId: nonConformity.id,
          });

          if (
            correctiveActions.filter(
              (ca) => ca.status === NCCorrectiveActionStatus.CLOSED,
            ).length === 0
          ) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_042'),
            );
          }
        }

        if (investigation.action == InvestigationAction.CLOSE) {
          if (
            (await this.findAllInvestigationEvidence(investigation.id, user))
              .length === 0
          ) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_043'),
            );
          }
        }
      }

      nonConformity.closedBy = { id: user.id } as any;
      nonConformity.status = NCStatus.CLOSED;

      if (dto.closingComment !== undefined) {
        nonConformity.closingComment = dto.closingComment;
      }

      if (dto.needsInvestigation !== undefined) {
        nonConformity.needsInvestigation =
          typeof dto.needsInvestigation === 'string'
            ? dto.needsInvestigation === 'true'
            : dto.needsInvestigation === true;
      }

      if (removedFiles && removedFiles.length > 0) {
        await Promise.all(
          removedFiles.map((e) => this.fileService.deleteFile(e)),
        );
        nonConformity.evidenceFiles = nonConformity.evidenceFiles.filter(
          (e) => !removedFiles.includes(e),
        );
      }

      if (evidenceFiles && evidenceFiles.length > 0) {
        const uploadedFiles = await Promise.all(
          evidenceFiles.map((file) =>
            this.fileService.uploadFile(file),
          ),
        );
        nonConformity.evidenceFiles = [
          ...(nonConformity.evidenceFiles || []),
          ...uploadedFiles,
        ];
      }

      await queryRunner.manager.save(nonConformity);
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to close non-conformity: ${error.message || error}`,
      );
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_071', { cause: error }),
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateNonConformity(
    nonConformityDto: UpdateNonConformityDto,
    user: any,
    evidenceFiles?: any[],
    fieldFiles?: any[],
  ): Promise<void> {
    const queryRunner =
      this.nonConformityRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const query = this.nonConformityRepository
        .createQueryBuilder('nonConformity')
        .leftJoinAndSelect('nonConformity.team', 'team')
        .leftJoinAndSelect(
          'nonConformity.nonConformityRiskLevel',
          'nonConformityRiskLevel',
        )
        .leftJoinAndSelect(
          'nonConformity.nonConformityType',
          'nonConformityType',
        )
        .leftJoinAndSelect('nonConformity.representative', 'representative')
        .andWhere('team.id IN (:...teamIds)', {
          teamIds: this.accessibleTeamIds(user),
        })
        .andWhere('nonConformity.id = :id', { id: nonConformityDto.id })
        .andWhere('nonConformity.deleted = :deleted', {
          deleted: false,
        });

      const nonConformity = await query.getOne();

      if (!nonConformity) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      this.assertNcMutable(nonConformity);

      if (Array.isArray(nonConformityDto.removedFiles)) {
        nonConformityDto.removedFiles = nonConformityDto.removedFiles.map(
          (e) => {
            return typeof e === 'string' ? JSON.parse(e) : e;
          },
        );
      }

      if (nonConformityDto.teamId != undefined) {
        await this.assertTeamAccess(user, nonConformityDto.teamId, 'update');
        nonConformity.team = {
          id: nonConformityDto.teamId,
        } as any;
        nonConformity.teamId = nonConformityDto.teamId;
      }


      if (nonConformityDto.categoryId != undefined) {
        nonConformity.category = {
          id: nonConformityDto.categoryId,
        } as Category;
        nonConformity.categoryId = nonConformityDto.categoryId;
      }

      if (
        nonConformityDto.representativeId !== undefined ||
        nonConformityDto.representativeType !== undefined
      ) {
        const teamIdForRep =
          nonConformityDto.teamId !== undefined
            ? nonConformityDto.teamId
            : nonConformity.teamId;
        const repPayload = await this.resolveNonConformityRepresentativePayload({
          representativeId: nonConformityDto.representativeId,
          representativeType: nonConformityDto.representativeType,
          teamId: teamIdForRep,
          legacyInferExternalWhenIdWithoutType: true,
        });
        nonConformity.representativeType = repPayload.representativeType;
        nonConformity.representativeId = repPayload.representativeId;
        nonConformity.representative = repPayload.representativeId
          ? ({ id: repPayload.representativeId } as NonConformityRepresentative)
          : null;
        nonConformity.internalRepresentativeId =
          repPayload.internalRepresentativeId;
        nonConformity.internalRepresentative =
          repPayload.internalRepresentativeId
            ? ({ id: repPayload.internalRepresentativeId } as User)
            : null;
      }

      if (nonConformityDto.responsibleUserId !== undefined) {
        const teamIdForResponsible =
          nonConformityDto.teamId !== undefined
            ? nonConformityDto.teamId
            : nonConformity.teamId;
        if (nonConformityDto.responsibleUserId) {
          await this.assertResponsibleUserBelongsToTeam(nonConformityDto.responsibleUserId, teamIdForResponsible);
          nonConformity.responsibleUser = {
            id: nonConformityDto.responsibleUserId,
          } as any;
          nonConformity.responsibleUserId = nonConformityDto.responsibleUserId;
        } else {
          nonConformity.responsibleUser = null;
          nonConformity.responsibleUserId = null;
        }
      }

      if (nonConformityDto.nonConformityTypeId != undefined) {
        nonConformity.nonConformityType = {
          id: nonConformityDto.nonConformityTypeId,
        } as NonConformityType;
        nonConformity.nonConformityTypeId =
          nonConformityDto.nonConformityTypeId;
      }

      if (nonConformityDto.nonConformityRiskLevelId != undefined) {
        nonConformity.nonConformityRiskLevel = {
          id: nonConformityDto.nonConformityRiskLevelId,
        } as NonConformityRiskLevel;
        nonConformity.nonConformityRiskLevelId =
          nonConformityDto.nonConformityRiskLevelId;
      }

      if (nonConformityDto.dateReported != undefined) {
        nonConformity.dateReported = new Date(
          nonConformityDto.dateReported,
        ).valueOf();
      }

      if (nonConformityDto.dueDate != undefined) {
        nonConformity.dueDate = new Date(nonConformityDto.dueDate).valueOf();
      }

      if (nonConformityDto.problemStatement != undefined) {
        nonConformity.problemStatement = nonConformityDto.problemStatement;
      }

      if (nonConformityDto.objectiveEvidence != undefined) {
        nonConformity.objectiveEvidence = nonConformityDto.objectiveEvidence;
      }

      if (nonConformityDto.requirements != undefined) {
        nonConformity.requirements = nonConformityDto.requirements;
      }

      if (nonConformityDto.status !== undefined) {
        if (nonConformityDto.status === NCStatus.CLOSED) {
          throw new BadRequestException(
            nonConformityHttpError('NON_CONFORMITY_056'),
          );
        }
        nonConformity.status = nonConformityDto.status;
      }

      if (nonConformityDto.closingComment != undefined) {
        nonConformity.closingComment = nonConformityDto.closingComment;
      }

      if (nonConformityDto.needsInvestigation !== undefined) {
        nonConformity.needsInvestigation =
          typeof nonConformityDto.needsInvestigation === 'string'
            ? nonConformityDto.needsInvestigation === 'true'
            : nonConformityDto.needsInvestigation === true;
      }

      if (
        nonConformityDto.removedFiles &&
        nonConformityDto.removedFiles.length > 0
      ) {
        await Promise.all(
          nonConformityDto.removedFiles.map((e) =>
            this.fileService.deleteFile(e),
          ),
        );
        nonConformity.evidenceFiles = nonConformity.evidenceFiles.filter(
          (e) => !nonConformityDto.removedFiles.includes(e),
        );
      }

      if (evidenceFiles && evidenceFiles.length > 0) {
        const uploadedFiles = await Promise.all(
          evidenceFiles.map((file) =>
            this.fileService.uploadFile(file),
          ),
        );
        nonConformity.evidenceFiles = [
          ...(nonConformity.evidenceFiles || []),
          ...uploadedFiles,
        ];
      }

      let fileFieldIdSet = new Set(nonConformityDto.uuids || []);
      let uploadedFieldFiles: string[] = [];
      if (
        fieldFiles &&
        fieldFiles.length > 0 &&
        nonConformityDto.uuids &&
        nonConformityDto.uuids.length > 0
      ) {
        try {
          uploadedFieldFiles = await Promise.all(
            fieldFiles.map((file) =>
              this.fileService.uploadFile(file),
            ),
          );
        } catch (error: any) {
          this.logger.error(
            `S3 upload failed for custom field files: ${error.message}`,
          );
          throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_044'));
        }
      }

      if (
        nonConformityDto.customFieldValues ||
        (uploadedFieldFiles.length > 0 &&
          nonConformityDto.uuids &&
          nonConformityDto.uuids.length > 0)
      ) {
        let customFieldValuesArray: any[] = [];
        if (typeof nonConformityDto.customFieldValues === 'string') {
          try {
            customFieldValuesArray = JSON.parse(
              nonConformityDto.customFieldValues,
            );
          } catch (e) {
            throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_035'));
          }
        } else if (Array.isArray(nonConformityDto.customFieldValues)) {
          customFieldValuesArray = nonConformityDto.customFieldValues;
        }

        const updatedCustomFieldValues: any[] = [];

        if (
          uploadedFieldFiles.length > 0 &&
          nonConformityDto.uuids &&
          nonConformityDto.uuids.length > 0
        ) {
          for (let i = 0; i < nonConformityDto.uuids.length; i++) {
            const customFieldId = nonConformityDto.uuids[i];
            const uploadedFile = uploadedFieldFiles[i];
            if (uploadedFile) {
              updatedCustomFieldValues.push(
                this.ncCustomFieldValueRepository.create({
                  customField: { id: customFieldId },
                  value: uploadedFile,
                  nonConformity: { id: nonConformity.id } as any,
                }),
              );
            }
          }
        }

        for (const fieldValue of customFieldValuesArray) {
          if (fileFieldIdSet.has(fieldValue.customFieldId)) continue;
          const cfv = this.ncCustomFieldValueRepository.create({
            id: fieldValue.id,
            customField: {
              id: fieldValue.customFieldId,
            } as CategoryCustomField,
            value:
              typeof fieldValue.value === 'object'
                ? JSON.stringify(fieldValue.value)
                : String(fieldValue.value ?? ''),
            nonConformity: { id: nonConformity.id } as any,
          });
          updatedCustomFieldValues.push(cfv);
        }
        nonConformity.customFieldValues = updatedCustomFieldValues;
      }

      await queryRunner.manager.save(nonConformity);
      await queryRunner.commitTransaction();
    } catch (error: any) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to update non-conformity: ${error.message || error}`,
      );
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_072', { cause: error }),
      );
    } finally {
      await queryRunner.release();
    }
  }

  async amendNonConformityDueDate(
    id: string,
    dto: AmendNonConformityDueDateDto,
    user: any,
  ): Promise<void> {
    const nonConformity = await this.nonConformityRepository.findOne({
      where: {
        id,
        deleted: false,
      },
    });

    if (!nonConformity) {
      throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
    }

    if (nonConformity.status === NCStatus.CLOSED) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_082'));
    }

    const newDueDate = new Date(dto.dueDate).valueOf();
    if (!Number.isFinite(newDueDate)) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_080'));
    }

    const startOfToday = getLocalStartOfDay(Date.now());
    if (getLocalStartOfDay(newDueDate) < startOfToday) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_080'));
    }

    if (
      getLocalStartOfDay(newDueDate) ===
      getLocalStartOfDay(Number(nonConformity.dueDate))
    ) {
      throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_081'));
    }

    const previousDueDate = Number(nonConformity.dueDate);
    nonConformity.dueDate = newDueDate;
    await this.nonConformityRepository.save(nonConformity);

    const amendment = this.ncDueDateAmendmentRepository.create({
      nonConformityId: nonConformity.id,
      previousDueDate,
      newDueDate,
      amendedById: user.id,
      amendedAt: Date.now(),
    });
    await this.ncDueDateAmendmentRepository.save(amendment);
  }

  async deleteNonConformity(id: string, user: any): Promise<void> {
    try {
      const nonConformity = await this.nonConformityRepository.findOne({
        where: { id, deleted: false },
      });

      if (!nonConformity) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      //check if nc is valid to be deleted
      await this.closeNonConformity(nonConformity.id, {}, user);

      const toSoftDelete = await this.nonConformityRepository.findOne({
        where: { id, deleted: false },
      });
      if (!toSoftDelete) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }
      toSoftDelete.name = `${toSoftDelete.name}_DELETED_${Date.now()}`;
      toSoftDelete.deleted = true;
      await this.nonConformityRepository.save(toSoftDelete);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async createNonConformityRepresentative(
    nonConformityRepresentativeDto: CreateNonConformityRepresentativeDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      //check if representative already exists
      const existingRepresentative =
        await this.nonConformityRepresentativeRepository.findOne({
          where: {
            email: nonConformityRepresentativeDto.email,
            deleted: false,
          },
        });
      if (existingRepresentative) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_045'));
      }
      const newNonConformityRepresentative =
        this.nonConformityRepresentativeRepository.create({
          ...nonConformityRepresentativeDto,
          createdBy: { id: user.id } as any,
        });
      await this.nonConformityRepresentativeRepository.save(
        newNonConformityRepresentative,
      );
      return { id: newNonConformityRepresentative.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllRepresentatives(
    user: any,
    filter: any,
  ): Promise<NonConformityRepresentative[]> {
    try {
      const search = (filter?.search as string | undefined)?.trim();
      const personnelType =
        typeof filter?.personnelType === 'string'
          ? filter.personnelType.toLowerCase()
          : undefined;

      const parseRequestedTeamIds = (): number[] => {
        const fromList: number[] = [];
        const multiRaw = filter?.teamIds;
        if (multiRaw !== undefined && multiRaw !== null && `${multiRaw}`.trim()) {
          const parts = String(multiRaw).split(',');
          for (const part of parts) {
            const n = parseInt(part.trim(), 10);
            if (!Number.isNaN(n) && n > 0) {
              fromList.push(n);
            }
          }
        }
        const ouRaw = filter?.teamId;
        if (ouRaw !== undefined && ouRaw !== null && `${ouRaw}`.length > 0) {
          const n = parseInt(String(ouRaw), 10);
          if (!Number.isNaN(n) && n > 0) {
            fromList.push(n);
          }
        }
        return [...new Set(fromList)];
      };

      const requestedTeamIds = parseRequestedTeamIds();
      const allowedOrgIds: number[] = Array.isArray(user.teamIds)
        ? user.teamIds
        : [];
      const scopeInternalToTeams = requestedTeamIds.length > 0;
      let unionAllowedOrgIds = allowedOrgIds;
      if (scopeInternalToTeams) {
        const { teamIds: ncReadTeamIds } =
          await this.permissionService.hasPermissions(
            user,
            nonConformityPermission.subject,
            ['read'],
          );
        unionAllowedOrgIds = [
          ...new Set([...allowedOrgIds, ...ncReadTeamIds]),
        ];
      }
      const effectiveTeamIds = scopeInternalToTeams
        ? requestedTeamIds.filter((id) => unionAllowedOrgIds.includes(id))
        : [];

      const includeInternal = personnelType !== 'external';
      const includeExternal = personnelType !== 'internal';
      const searchTerm = search ? `%${search.toLowerCase()}%` : null;
      const searchNeedle = search ? search.toLowerCase() : '';

      const mapUnionRow = (row: Record<string, unknown>): NonConformityRepresentative => {
        const originalId = String(row.original_id ?? row.ORIGINAL_ID ?? '');
        const fname = String(row.fname ?? row.FNAME ?? '');
        const lname = String(row.lname ?? row.LNAME ?? '');
        const email = String(row.email ?? row.EMAIL ?? '');
        const repType = String(row.rep_type ?? row.REP_TYPE ?? '');
        return {
          id: originalId,
          firstName: fname,
          lastName: lname,
          email,
          isExternal: repType === 'EXTERNAL',
        } as NonConformityRepresentative;
      };

      const internalFromTeam: NonConformityRepresentative[] = [];
      if (includeInternal && effectiveTeamIds.length > 0) {
        const usersWithAccess = await this.permissionService.usersWithAccess(
          effectiveTeamIds,
          user,
          nonConformityPermission.subject,
        );
        for (const u of usersWithAccess) {
          if (searchNeedle) {
            const fullName = `${u.fname ?? ''} ${u.lname ?? ''}`.toLowerCase();
            const emailLower = (u.email ?? '').toLowerCase();
            if (
              !fullName.includes(searchNeedle) &&
              !emailLower.includes(searchNeedle)
            ) {
              continue;
            }
          }
          internalFromTeam.push({
            id: u.id,
            firstName: u.fname ?? '',
            lastName: u.lname ?? '',
            email: u.email ?? '',
            isExternal: false,
          } as NonConformityRepresentative);
        }
      }

      const unionBranches: string[] = [];
      const params: unknown[] = [];

      if (includeInternal && !scopeInternalToTeams) {
        let userWhere =
          'u.deleted = 0 AND u.is_active = 1';
        if (searchTerm) {
          userWhere += `
    AND (
      LOWER(CONCAT(COALESCE(u.fname, ''), ' ', COALESCE(u.lname, ''))) LIKE ?
      OR LOWER(u.email) LIKE ?
    )`;
          params.push(searchTerm, searchTerm);
        }
        unionBranches.push(`
  SELECT
    u.id AS original_id,
    u.fname AS fname,
    u.lname AS lname,
    u.email AS email,
    'INTERNAL' AS rep_type
  FROM users u
  WHERE ${userWhere}`);
      }

      if (includeExternal) {
        let repWhere = 'r.deleted = 0';
        if (searchTerm) {
          repWhere += `
    AND (
      LOWER(CONCAT(COALESCE(r.first_name, ''), ' ', COALESCE(r.last_name, ''))) LIKE ?
      OR LOWER(r.email) LIKE ?
    )`;
          params.push(searchTerm, searchTerm);
        }
        unionBranches.push(`
  SELECT
    r.id AS original_id,
    r.first_name AS fname,
    r.last_name AS lname,
    r.email AS email,
    'EXTERNAL' AS rep_type
  FROM non_conformity_representatives r
  WHERE ${repWhere}`);
      }

      if (unionBranches.length === 0) {
        return internalFromTeam;
      }

      const innerSql = unionBranches.join('\n  UNION ALL\n').trim();
      const sql =
        unionBranches.length === 1
          ? innerSql
          : `SELECT
  combined.original_id AS original_id,
  combined.fname AS fname,
  combined.lname AS lname,
  combined.email AS email,
  combined.rep_type AS rep_type
FROM (${innerSql}) AS combined`;

      const rows = await this.nonConformityRepresentativeRepository.query(
        sql,
        params,
      );

      const fromSql = (rows as Record<string, unknown>[]).map((row) =>
        mapUnionRow(row),
      );

      return [...internalFromTeam, ...fromSql];
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneNonConformityRepresentative(
    id: string,
    user: any,
  ): Promise<NonConformityRepresentativeResponseDTO> {
    try {
      const query = this.nonConformityRepresentativeRepository
        .createQueryBuilder('nonConformityRepresentative')
        .select([
          'nonConformityRepresentative.id',
          'nonConformityRepresentative.firstName',
          'nonConformityRepresentative.lastName',
          'nonConformityRepresentative.email',
          'nonConformityRepresentative.isExternal',
        ])
        .andWhere('nonConformityRepresentative.deleted = :deleted', {
          deleted: false,
        })
        .andWhere('nonConformityRepresentative.id = :id', { id });

      const nonConformityRepresentative = await query.getOne();
      if (!nonConformityRepresentative) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_030'));
      }

      return nonConformityRepresentative;
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateNonConformityRepresentative(
    nonConformityRepresentativeDto: UpdateNonConformityRepresentativeDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      const query = this.nonConformityRepresentativeRepository
        .createQueryBuilder('nonConformityRepresentative')
        .andWhere('nonConformityRepresentative.id = :id', {
          id: nonConformityRepresentativeDto.id,
        })
        .andWhere('nonConformityRepresentative.deleted = :deleted', {
          deleted: false,
        });

      const nonConformityRepresentative = await query.getOne();

      if (!nonConformityRepresentative) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_030'));
      }

      if (nonConformityRepresentativeDto.email) {
        const existingRepresentative = await this.nonConformityRepresentativeRepository.
        createQueryBuilder('nonConformityRepresentative')
        .where('nonConformityRepresentative.email = :email', {
          email: nonConformityRepresentativeDto.email,
        })
        .andWhere('nonConformityRepresentative.deleted = :deleted', {
          deleted: false,
        })
        .andWhere('nonConformityRepresentative.id != :id', {
          id: nonConformityRepresentative.id,
        })
        .getOne();
        if (existingRepresentative) {
          throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_047'));
        }
      }

      await this.nonConformityRepresentativeRepository.update(
        nonConformityRepresentative.id,
        nonConformityRepresentativeDto,
      );
      return { id: nonConformityRepresentative.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteNonConformityRepresentative(
    id: string,
    user: any,
  ): Promise<{ id: string }> {
    try {
      const nonConformityRepresentative =
        await this.nonConformityRepresentativeRepository.findOne({
          where: { id, deleted: false },
        });

      if (!nonConformityRepresentative) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_030'));
      }

      const nonConformity = await this.nonConformityRepository.findOne({
        where: {
          representative: { id },
          deleted: false,
        },
      });

      if (nonConformity) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_048'),
        );
      }

      nonConformityRepresentative.email = `${nonConformityRepresentative.email}_DELETED_${Date.now()}`;
      nonConformityRepresentative.deleted = true;
      await this.nonConformityRepresentativeRepository.save(
        nonConformityRepresentative,
      );
      return { id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async createCorrectiveAction(
    correctiveActionDto: CreateNCCorrectiveActionDto,
    user: any,
  ): Promise<{ id: string }> {
    try {
      const nonConformity = await this.nonConformityRepository.findOne({
        where: {
          id: correctiveActionDto.nonConformityId,
          status: NCStatus.OPEN,
          deleted: false,
        },
      });
      if (!nonConformity) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      this.assertNcMutable(nonConformity);

      const membership = await this.teamMemberRepository.findOne({
        where: {
          userId: correctiveActionDto.assignedToId,
          teamId: nonConformity.teamId,
        },
      });
      const isMember = !!membership;
      if (!isMember) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_049'),
        );
      }

      const newCorrectiveAction = this.ncCorrectiveActionRepository.create({
        ...correctiveActionDto,
        dueDate: new Date(correctiveActionDto.dueDate).valueOf(),
        assignedTo: { id: correctiveActionDto.assignedToId } as any,
        nonConformity: nonConformity,
        createdBy: { id: user.id } as any,
        createdAt: Date.now(),
        status: NCCorrectiveActionStatus.OPEN,
        ncCorrectiveActionCauses:
          correctiveActionDto.ncCorrectiveActionCauses.map((cause) => {
            const causeEntity: any = {
            };
            
            if (cause.rcaCauseId) {
              causeEntity.rcaCause = { id: cause.rcaCauseId } as any;
            }
            
            if (cause.rcaFiveWhyStepId) {
              causeEntity.rcaFiveWhyStep = { id: cause.rcaFiveWhyStepId } as any;
            }
            
            return causeEntity;
          }),
      });
      await this.ncCorrectiveActionRepository.save(newCorrectiveAction);
      return { id: newCorrectiveAction.id };
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllCorrectiveActions(
    user: any,
    filter: CorrectiveActionQueryDto,
  ): Promise<NCCorrectiveAction[]> {
    try {
      const query = this.ncCorrectiveActionRepository
        .createQueryBuilder('ncCorrectiveAction')

        .leftJoinAndSelect('ncCorrectiveAction.assignedTo', 'assignedTo')
        .leftJoinAndSelect('ncCorrectiveAction.createdBy', 'createdBy')
        .leftJoinAndSelect('ncCorrectiveAction.verifiedBy', 'verifiedBy')
        .select([
          'ncCorrectiveAction.id',
          'ncCorrectiveAction.title',
          'ncCorrectiveAction.description',
          'ncCorrectiveAction.priority',
          'ncCorrectiveAction.dueDate',
          'ncCorrectiveAction.status',
          'ncCorrectiveAction.createdById',
          'ncCorrectiveAction.createdAt',
          'ncCorrectiveAction.closedAt',
          'ncCorrectiveAction.verifiedAt',
          'ncCorrectiveAction.appliedAt',
          'ncCorrectiveAction.rejectionExplanation',
          'ncCorrectiveAction.source',
          'createdBy.id',
          'assignedTo.id',
          'assignedTo.fname',
          'assignedTo.lname',
          'createdBy.fname',
          'createdBy.lname',
          'verifiedBy.id',
          'verifiedBy.fname',
          'verifiedBy.lname',
        ])
        .andWhere('ncCorrectiveAction.deleted = :deleted', {
          deleted: false,
        })
        .andWhere('ncCorrectiveAction.nonConformityId = :nonConformityId', {
          nonConformityId: filter.nonConformityId,
        })
        .orderBy('ncCorrectiveAction.priority', 'ASC');

      if (filter.search) {
        query.andWhere('ncCorrectiveAction.title LIKE :search', {
          search: `%${filter.search}%`,
        });
      }

      if (filter.priority) {
        query.andWhere('ncCorrectiveAction.priority = :priority', {
          priority: filter.priority,
        });
      }

      if (filter.status) {
        query.andWhere('ncCorrectiveAction.status = :status', {
          status: filter.status,
        });
      }

      if (filter.assignee) {
        query.andWhere('ncCorrectiveAction.assignedTo = :assignedTo', {
          assignedTo: filter.assignee,
        });
      }

      return await query.getMany();
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneCorrectiveAction(
    id: string,
    user: any,
  ): Promise<NCCorrectiveAction> {
    try {
      const query = this.ncCorrectiveActionRepository
        .createQueryBuilder('ncCorrectiveAction')
        .leftJoinAndSelect('ncCorrectiveAction.assignedTo', 'assignedTo')
        .leftJoinAndSelect('ncCorrectiveAction.createdBy', 'createdBy')
        .leftJoinAndSelect('ncCorrectiveAction.verifiedBy', 'verifiedBy')
        .leftJoinAndSelect(
          'ncCorrectiveAction.changeRequests',
          'changeRequests',
          'changeRequests.deleted = :crDeleted',
          { crDeleted: false },
        )
        .leftJoinAndSelect('changeRequests.newAssignee', 'newAssignee')
        .leftJoinAndSelect(
          'ncCorrectiveAction.effectivenessEvidences',
          'effectivenessEvidences',
        )
        .leftJoinAndSelect('effectivenessEvidences.uploadedBy', 'uploadedBy')
        .leftJoinAndSelect(
          'ncCorrectiveAction.ncCorrectiveActionCauses',
          'ncCACauses',
        )
        .leftJoinAndSelect('ncCACauses.rcaCause', 'rcaCause')
        .leftJoinAndSelect('ncCACauses.rcaFiveWhyStep', 'rcaFiveWhyStep')
        .where('ncCorrectiveAction.id = :id', { id })
        .andWhere('ncCorrectiveAction.deleted = :deleted', { deleted: false });
      const correctiveAction = await query.getOne();
      if (!correctiveAction) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_016'));
      }
      return correctiveAction;
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateCorrectiveAction(
    updateCorrectiveActionDto: UpdateNCCorrectiveActionDto,
    user: any,
  ): Promise<void> {
    try {
      const correctiveAction = await this.ncCorrectiveActionRepository.findOne({
        where: {
          id: updateCorrectiveActionDto.id,
          deleted: false,
        },
        relations: ['nonConformity'],
      });
      if (!correctiveAction) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_016'));
      }

      this.assertNcMutable(correctiveAction.nonConformity);

      if (correctiveAction.status === NCCorrectiveActionStatus.CLOSED) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_050'),
        );
      }

      if (updateCorrectiveActionDto.status !== undefined) {
        // Check if trying to apply CA while there are pending change requests
        if (updateCorrectiveActionDto.status === NCCorrectiveActionStatus.APPLIED) {
          const pendingChangeRequests = await this.caChangeRequestRepository.find({
            where: {
              ca: { id: correctiveAction.id },
              status: CaChangeRequestStatus.PENDING,
              deleted: false,
            },
          });
          if (pendingChangeRequests && pendingChangeRequests.length > 0) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_051'),
            );
          }
        }

        correctiveAction.status = updateCorrectiveActionDto.status;

        const now = Date.now();
        switch (updateCorrectiveActionDto.status) {
          case NCCorrectiveActionStatus.CLOSED:
            correctiveAction.closedAt = now;
            break;
          case NCCorrectiveActionStatus.VERIFIED:
            correctiveAction.verifiedAt = now;
            correctiveAction.verifiedById = user.id;
            break;
          case NCCorrectiveActionStatus.APPLIED:
            correctiveAction.appliedAt = now;
            break;
        }

        if (
          updateCorrectiveActionDto.rejectionExplanation !== undefined &&
          updateCorrectiveActionDto.status === NCCorrectiveActionStatus.OPEN
        ) {
          correctiveAction.rejectionExplanation =
            updateCorrectiveActionDto.rejectionExplanation;
        }
      }

      if (updateCorrectiveActionDto.title !== undefined) {
        correctiveAction.title = updateCorrectiveActionDto.title;
      }

      if (updateCorrectiveActionDto.description !== undefined) {
        correctiveAction.description = updateCorrectiveActionDto.description;
      }

      if (updateCorrectiveActionDto.expectedOutcome !== undefined) {
        correctiveAction.expectedOutcome =
          updateCorrectiveActionDto.expectedOutcome;
      }

      if (updateCorrectiveActionDto.priority !== undefined) {
        correctiveAction.priority = updateCorrectiveActionDto.priority;
      }

      if (updateCorrectiveActionDto.dueDate !== undefined) {
        correctiveAction.dueDate = new Date(
          updateCorrectiveActionDto.dueDate,
        ).valueOf();
      }

      if (updateCorrectiveActionDto.assignedToId !== undefined) {
        correctiveAction.assignedTo = {
          id: updateCorrectiveActionDto.assignedToId,
        } as any;
        correctiveAction.status = NCCorrectiveActionStatus.OPEN;
      }

      if (updateCorrectiveActionDto.ncCorrectiveActionCauses !== undefined) {
        const causes = (
          updateCorrectiveActionDto.ncCorrectiveActionCauses || []
        ).map((cause) => {
          const causeEntity: any = {
          };
          
          if (cause.id) {
            causeEntity.id = cause.id;
          }
          
          if (cause.rcaCauseId) {
            causeEntity.rcaCause = { id: cause.rcaCauseId } as any;
          }
          
          if (cause.rcaFiveWhyStepId) {
            causeEntity.rcaFiveWhyStep = { id: cause.rcaFiveWhyStepId } as any;
          }
          
          return causeEntity;
        });
        correctiveAction.ncCorrectiveActionCauses = causes as any;
      }

      await this.ncCorrectiveActionRepository.save(correctiveAction);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteCorrectiveAction(id: string, user: any): Promise<void> {
    try {
      const correctiveAction = await this.ncCorrectiveActionRepository.findOne({
        where: { id, deleted: false },
      });
      if (!correctiveAction) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_016'));
      }

      await this.assertNcMutableById(correctiveAction.nonConformityId);

      correctiveAction.deleted = true;
      await this.ncCorrectiveActionRepository.save(correctiveAction);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async createCaChangeRequest(
    caChangeRequestDto: CreateCaChangeRequestDto,
    user: any,
  ): Promise<void> {
    try {
      const ca = await this.ncCorrectiveActionRepository.findOne({
        where: {
          id: caChangeRequestDto.caId,
          status: NCCorrectiveActionStatus.OPEN,
          deleted: false,
        },
      });
      if (!ca) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_016'));
      }

      await this.assertNcMutableById(ca.nonConformityId);

      const existingChangeRequest =
        await this.caChangeRequestRepository.findOne({
          where: {
            ca: { id: ca.id },
            type: caChangeRequestDto.type,
            status: CaChangeRequestStatus.PENDING,
            deleted: false,
          },
        });
      if (existingChangeRequest) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_052'),
        );
      }

      if (ca.assignedToId !== user.id) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_053'),
        );
      }

      const caChangeRequest = this.caChangeRequestRepository.create({
        ...caChangeRequestDto,
        ca: ca,
        requestedBy: { id: user.id } as any,
        requestedById: user.id,
        newAssignee: caChangeRequestDto.newAssigneeId
          ? ({ id: caChangeRequestDto.newAssigneeId } as any)
          : null,
        newDueDate: caChangeRequestDto.newDueDate
          ? new Date(caChangeRequestDto.newDueDate).valueOf()
          : null,
        status: CaChangeRequestStatus.PENDING,
      });
      await this.caChangeRequestRepository.save(caChangeRequest);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllCaChangeRequests(
    user: any,
    filter: any,
  ): Promise<CaChangeRequest[]> {
    try {
      const query = this.caChangeRequestRepository
        .createQueryBuilder('caChangeRequest')
        .select([
          'caChangeRequest.id',
          'caChangeRequest.title',
          'caChangeRequest.type',
          'caChangeRequest.status',
          'caChangeRequest.reason',
          'caChangeRequest.newDueDate',
          'caChangeRequest.newAssignee',
          'caChangeRequest.requestedById',
        ])
        .leftJoinAndSelect('caChangeRequest.ca', 'ca')
        .leftJoinAndSelect('caChangeRequest.newAssignee', 'newAssignee')
        .andWhere('caChangeRequest.deleted = :deleted', {
          deleted: false,
        })
        .andWhere('caChangeRequest.caId = :caId', {
          caId: filter.caId,
        });

      if (filter.search) {
        query.andWhere('caChangeRequest.reason LIKE :search', {
          search: `%${filter.search}%`,
        });
      }

      if (filter.status) {
        query.andWhere('caChangeRequest.status = :status', {
          status: filter.status,
        });
      }

      if (filter.type) {
        query.andWhere('caChangeRequest.type = :type', {
          type: filter.type,
        });
      }

      return await query.getMany();
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneCaChangeRequest(
    id: string,
    user: any,
  ): Promise<CaChangeRequest> {
    try {
      const query = this.caChangeRequestRepository
        .createQueryBuilder('caChangeRequest')
        .select([
          'caChangeRequest.id',
          'caChangeRequest.type',
          'caChangeRequest.status',
          'caChangeRequest.reason',
          'caChangeRequest.newDueDate',
          'caChangeRequest.newAssigneeId',
          'caChangeRequest.reviewedAt',
          'caChangeRequest.reviewedById',
        ])
        .leftJoinAndSelect('caChangeRequest.ca', 'ca')
        .leftJoinAndSelect('caChangeRequest.requestedBy', 'requestedBy')
        .leftJoinAndSelect('caChangeRequest.reviewedBy', 'reviewedBy')
        .where('caChangeRequest.id = :id', { id })
        .andWhere('caChangeRequest.deleted = :deleted', { deleted: false });
      const caChangeRequest = await query.getOne();
      if (!caChangeRequest) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_054'));
      }
      return caChangeRequest;
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateCaChangeRequest(
    updateCaChangeRequestDto: UpdateCaChangeRequestDto,
    user: any,
  ): Promise<void> {
    const queryRunner =
      this.caChangeRequestRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const caChangeRequest = await queryRunner.manager.findOne(
        this.caChangeRequestRepository.target,
        {
          where: {
            id: updateCaChangeRequestDto.id,
            deleted: false,
          },
        },
      );
      if (!caChangeRequest) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_054'));
      }
      if (updateCaChangeRequestDto.status !== undefined) {
        if (
          updateCaChangeRequestDto.status === CaChangeRequestStatus.APPROVED
        ) {
          // Reuse the existing updateCorrectiveAction logic instead of duplicating updates
          if (
            caChangeRequest.type === CaChangeRequestType.DUE_DATE_CHANGE &&
            caChangeRequest.newDueDate != undefined
          ) {
            await this.updateCorrectiveAction(
              {
                id: caChangeRequest.caId,
                dueDate: Number(caChangeRequest.newDueDate),
              } as any,
              user,
            );
          }
          if (
            caChangeRequest.type === CaChangeRequestType.ASSIGNEE_CHANGE &&
            caChangeRequest.newAssigneeId != undefined
          ) {
            await this.updateCorrectiveAction(
              {
                id: caChangeRequest.caId,
                assignedToId: caChangeRequest.newAssigneeId,
              } as any,
              user,
            );
          }
        }
        caChangeRequest.status = updateCaChangeRequestDto.status;
      }
      await queryRunner.manager.save(
        this.caChangeRequestRepository.target,
        caChangeRequest,
      );
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteCaChangeRequest(id: string, user: any): Promise<void> {
    try {
      const caChangeRequest = await this.caChangeRequestRepository.findOne({
        where: { id, deleted: false },
      });
      if (!caChangeRequest) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_054'));
      }

      if (caChangeRequest.status === CaChangeRequestStatus.PENDING) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_055'));
      }

      caChangeRequest.deleted = true;
      await this.caChangeRequestRepository.save(caChangeRequest);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
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
    for (const person of users) {
      if (!person?.id || !person.email || person.id === actorId || seen.has(person.id)) {
        continue;
      }
      seen.add(person.id);
      recipients.push({ user: person, message });
    }
    return recipients;
  }

  private notificationResult(
    route: string,
    recipients: NotificationRecipient[],
  ): NotificationInfoResponse {
    return { skip: recipients.length === 0, route, recipients };
  }

  private async usersForTeam(
    teamId: number | null | undefined,
    subject: string,
    actorId?: string,
  ): Promise<User[]> {
    return this.permissionService.usersWithAccess(
      teamId != null ? [teamId] : [],
      { id: actorId ?? '', username: '', teamIds: [] },
      subject,
      teamId == null,
    );
  }

  async getNotificationInfo(
    data: NotificationInfoParam,
  ): Promise<NotificationInfoResponse> {
    const { entityId, subject, method, userId } = data;
    const none = (): NotificationInfoResponse => this.notificationResult('', []);
    try {
      switch (subject) {
        case 'non_conformity_categories':
        case 'non_conformity_category_custom_fields':
        case 'non_conformity_custom_field_values':
        case 'non_conformity_types':
        case 'non_conformity_risk_levels':
        case 'non_conformity_representatives':
        case 'rca_five_why_steps': {
          const users = await this.usersForTeam(null, subject, userId);
          const message =
            subject === 'non_conformity_categories'
              ? this.mapCategoryMessage(method)
              : subject === 'non_conformity_category_custom_fields'
                ? this.mapCustomFieldMessage(method)
                : subject === 'non_conformity_custom_field_values'
                  ? this.mapCustomFieldValueMessage(method)
                  : subject === 'non_conformity_types'
                    ? this.mapNonConformityTypeMessage(method)
                    : subject === 'non_conformity_risk_levels'
                      ? this.mapNonConformityRiskLevelMessage(method)
                      : subject === 'non_conformity_representatives'
                        ? this.mapNonConformityRepresentativeMessage(method)
                        : this.mapRCAFiveWhyStepMessage(method);
          return this.notificationResult(
            String(entityId),
            this.recipientsFor(users, message, userId),
          );
        }
        case 'non_conformities': {
          const nonConformity = await this.nonConformityRepository.findOne({
            where: { id: String(entityId), deleted: false },
            relations: [
              'createdBy',
              'responsibleUser',
              'internalRepresentative',
              'team',
            ],
          });
          if (!nonConformity) {
            return none();
          }
          const teamUsers = await this.usersForTeam(
            nonConformity.teamId,
            nonConformityPermission.subject,
            userId,
          );
          return this.notificationResult(
            nonConformity.id,
            this.recipientsFor(
              [
                nonConformity.createdBy,
                nonConformity.responsibleUser,
                nonConformity.internalRepresentative,
                ...teamUsers,
              ],
              this.mapNonConformityMessage(method),
              userId,
            ),
          );
        }
        case 'non_conformity_corrective_actions': {
          const correctiveAction = await this.ncCorrectiveActionRepository.findOne({
            where: { id: String(entityId), deleted: false },
            relations: ['nonConformity', 'assignedTo', 'createdBy'],
          });
          if (!correctiveAction?.nonConformity) {
            return none();
          }
          const message =
            method === 'createCorrectiveAction'
              ? 'assigned you to a corrective action'
              : this.mapCorrectiveActionMessage(method);
          const teamUsers = await this.usersForTeam(
            correctiveAction.nonConformity.teamId,
            nonConformityPermission.subject,
            userId,
          );
          return this.notificationResult(
            correctiveAction.nonConformityId,
            this.recipientsFor(
              [correctiveAction.assignedTo, correctiveAction.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'ca_change_requests': {
          const caChangeRequest = await this.caChangeRequestRepository.findOne({
            where: { id: String(entityId), deleted: false },
            relations: ['ca', 'ca.createdBy'],
          });
          if (!caChangeRequest?.ca?.createdBy) {
            return none();
          }
          return this.notificationResult(
            caChangeRequest.id,
            this.recipientsFor(
              [caChangeRequest.ca.createdBy],
              'created a change request for your corrective action',
              userId,
            ),
          );
        }
        case 'immediate_actions':
        case 'immediate_action_evidence': {
          const immediateActionEntity =
            await this.immediateActionCommonService.resolveImmediateActionForNotification(
              String(entityId),
              data.clientId,
              ['createdBy', 'assignedTo', 'nc'],
            );
          if (!immediateActionEntity) {
            return none();
          }
          return this.immediateActionCommonService.buildImmediateActionNotificationInfo(
            {
              method,
              action: immediateActionEntity,
              route: immediateActionEntity.nc?.id || immediateActionEntity.id,
            },
          );
        }
        case 'ca_effectiveness_evidence': {
          const evidence = await this.caEffectivenessEvidenceRepository.findOne({
            where: { id: String(entityId), deleted: false },
            relations: ['ca', 'ca.assignedTo', 'uploadedBy'],
          });
          if (!evidence?.ca) {
            return none();
          }
          return this.notificationResult(
            evidence.ca.nonConformityId,
            this.recipientsFor(
              [evidence.ca.assignedTo, evidence.uploadedBy],
              this.mapCaEffectivenessEvidenceMessage(method),
              userId,
            ),
          );
        }
        default:
          return none();
      }
    } catch (error: any) {
      this.logger.error(`Error in getNotificationInfo: ${error.message}`);
      return none();
    }
  }

  private mapNonConformityTypeMessage(method: string): string {
    switch (method) {
      case 'createNonConformityType':
        return 'created a non-conformity type';
      case 'updateNonConformityType':
        return 'updated a non-conformity type';
      case 'deleteNonConformityType':
        return 'deleted a non-conformity type';
      default:
        return 'modified a non-conformity type';
    }
  }

  private mapNonConformityRiskLevelMessage(method: string): string {
    switch (method) {
      case 'createNonConformityRiskLevel':
        return 'created a non-conformity risk level';
      case 'updateNonConformityRiskLevel':
        return 'updated a non-conformity risk level';
      case 'deleteNonConformityRiskLevel':
        return 'deleted a non-conformity risk level';
      default:
        return 'modified a non-conformity risk level';
    }
  }

  private mapCategoryMessage(method: string): string {
    switch (method) {
      case 'createCategory':
        return 'created a new non-conformity category';
      case 'updateCategory':
        return 'updated a non-conformity category';
      case 'deleteCategory':
        return 'deleted a non-conformity category';
      default:
        return 'modified a non-conformity category';
    }
  }

  private mapCustomFieldMessage(method: string): string {
    switch (method) {
      case 'createCategoryCustomField':
        return 'created a new non-conformity custom field';
      case 'updateCategoryCustomField':
        return 'updated a non-conformity custom field';
      case 'deleteCategoryCustomField':
        return 'deleted a non-conformity custom field';
      default:
        return 'modified a non-conformity custom field';
    }
  }

  private mapCustomFieldValueMessage(method: string): string {
    switch (method) {
      case 'createNCCustomFieldValue':
        return 'created a new non-conformity custom field value';
      case 'updateNCCustomFieldValue':
        return 'updated a non-conformity custom field value';
      case 'deleteNCCustomFieldValue':
        return 'deleted a non-conformity custom field value';
      default:
        return 'modified a non-conformity custom field value';
    }
  }

  private mapRCAFiveWhyStepMessage(method: string): string {
    switch (method) {
      case 'createRCAFiveWhyStep':
        return 'created a new RCA five why step';
      case 'updateRCAFiveWhyStep':
        return 'updated a RCA five why step';
      default:
        return 'modified a RCA five why step';
    }
  }

  // Helper method to send email notifications to RCA performers
  private async notifyRCAPerformers(
    performers: User[],
    ncId: string,
    rcaId: string,
  ): Promise<void> {
    try {
      if (!performers || performers.length === 0) {
        return;
      }

      for (const performer of performers) {
        if (!performer.email) {
          this.logger.warn(
            `Skipping email notification for performer ${performer.id} - no email address`,
          );
          continue;
        }

        const emailPayload = {
          to: performer.email,
          type: EmailType.NOTIFICATION,
          replaceString: {
            name: `${performer.fname} ${performer.lname}`.trim(),
            message: `You have been assigned as a performer for a Root Cause Analysis.`,
            link: `/act/non-conformities/${ncId}?tab=3`,
          },
        };

        this.queuePublisher.sendEmail(emailPayload);
        this.logger.log(
          `Sent RCA assignment email notification to ${performer.email}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        'Failed to send RCA performer email notifications',
        error,
      );
      // Don't throw - email failures shouldn't break the RCA creation/update
    }
  }

  // Root Cause Analysis Methods
  async createRootCauseAnalysis(
    createRootCauseAnalysisDto: CreateRootCauseAnalysisDto,
    user: any,
  ): Promise<RootCauseAnalysisResponseDTO> {
    try {
      const {
        nc_id,
        method,
        performed_by_ids,
        performed_at,
        problem_statement,
        description,
      } = createRootCauseAnalysisDto;

      // Check if NC exists
      const nc = await this.nonConformityRepository.findOne({
        where: { id: nc_id, deleted: false },
      });

      if (!nc) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      this.assertNcMutable(nc);

      // Check if an RCA already exists for this NC
      const existingRCA = await this.rootCauseAnalysisRepository.findOne({
        where: {
          nc: { id: nc_id },
          deleted: false,
        },
      });

      if (existingRCA) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_057'),
        );
      }

      // Validate and get performed by users (only if provided)
      let performers: User[] = [];
      if (performed_by_ids && performed_by_ids.length > 0) {
        const users: User[] = await this.userService.findAllBy(
          { id: In(performed_by_ids) },
          [],
        );

        if (users.length !== performed_by_ids.length) {
          throw new BadRequestException(
            nonConformityHttpError('NON_CONFORMITY_058'),
          );
        }

        performers = users;
      }

      const rootCauseAnalysis = this.rootCauseAnalysisRepository.create({
        nc,
        method: method as any,
        performedAt: performed_at || null,
        problemStatement: problem_statement || null,
        description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rootCauseAnalysisPerformers: performers.map((performer) =>
          this.rootCauseAnalysisPerformerRepository.create({
            user: performer,
          }),
        ),
      });

      const savedRootCauseAnalysis =
        await this.rootCauseAnalysisRepository.save(rootCauseAnalysis);

      // Fetch with relations
      const result = await this.rootCauseAnalysisRepository.findOne({
        where: { id: savedRootCauseAnalysis.id, deleted: false },
        relations: [
          'nc',
          'rootCauseAnalysisPerformers',
          'rootCauseAnalysisPerformers.user',
        ],
      });

      if (!result) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_070'));
      }

      // Send email notifications to all performers
      if (performers.length > 0) {
        await this.notifyRCAPerformers(performers, nc_id, result.id);
      }

      return this.formatRootCauseAnalysisEntity(result);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllRootCauseAnalysis(
    ncId: string,
    user: any,
  ): Promise<RootCauseAnalysisResponseDTO[]> {
    try {
      const rootCauseAnalyses = await this.rootCauseAnalysisRepository
        .createQueryBuilder('rca')
        .leftJoinAndSelect('rca.nc', 'nc')
        .leftJoinAndSelect(
          'rca.rootCauseAnalysisPerformers',
          'rootCauseAnalysisPerformers',
        )
        .leftJoinAndSelect('rootCauseAnalysisPerformers.user', 'performerUser')
        .leftJoinAndSelect(
          'rca.rcaCeCategories',
          'rcaCeCategories',
          'rcaCeCategories.deleted = :deleted',
          { deleted: false },
        )
        .leftJoinAndSelect('rcaCeCategories.rcaCeCauses', 'rcaCeCauses')
        .leftJoinAndSelect('rca.rcaFishbone', 'rcaFishbone')
        .leftJoinAndSelect('rca.rcaFiveWhySteps', 'rcaFiveWhySteps')
        .where('rca.nc.id = :ncId', { ncId })
        .andWhere('rca.deleted = :deleted', { deleted: false })
        .getMany();

      return rootCauseAnalyses.map((rca) =>
        this.formatRootCauseAnalysisEntity(rca),
      );
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneRootCauseAnalysis(
    id: string,
    user: any,
  ): Promise<RootCauseAnalysisResponseDTO> {
    try {
      const rootCauseAnalysis = await this.rootCauseAnalysisRepository
        .createQueryBuilder('rca')
        .leftJoinAndSelect('rca.nc', 'nc')
        .leftJoinAndSelect(
          'rca.rootCauseAnalysisPerformers',
          'rootCauseAnalysisPerformers',
        )
        .leftJoinAndSelect('rootCauseAnalysisPerformers.user', 'performerUser')
        .leftJoinAndSelect(
          'rca.rcaCeCategories',
          'rcaCeCategories',
          'rcaCeCategories.deleted = :catDeleted',
          { catDeleted: false },
        )
        .leftJoinAndSelect('rcaCeCategories.rcaCeCauses', 'rcaCeCauses')
        .leftJoinAndSelect('rca.rcaFiveWhySteps', 'rcaFiveWhySteps')
        .leftJoinAndSelect('rca.rcaFishbone', 'rcaFishbone')
        .where('rca.id = :id', { id })
        .andWhere('rca.deleted = :deleted', { deleted: false })
        .getOne();

      if (!rootCauseAnalysis) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
      }

      return this.formatRootCauseAnalysisEntity(rootCauseAnalysis);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateRootCauseAnalysis(
    id: string,
    updateRootCauseAnalysisDto: UpdateRootCauseAnalysisDto,
    user: any,
  ): Promise<RootCauseAnalysisResponseDTO> {
    try {
      const existingRootCauseAnalysis =
        await this.rootCauseAnalysisRepository.findOne({
          where: { id, deleted: false },
          relations: [
            'nc',
            'rootCauseAnalysisPerformers',
            'rootCauseAnalysisPerformers.user',
            'rcaCeCategories',
            'rcaFiveWhySteps',
            'rcaFishbone',
          ],
        });

      if (!existingRootCauseAnalysis) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
      }

      this.assertNcMutable(existingRootCauseAnalysis.nc);

      const updateData: any = {};

      if (
        updateRootCauseAnalysisDto.method !==
          existingRootCauseAnalysis.method &&
        (existingRootCauseAnalysis.rcaCeCategories?.length > 0 ||
          !!existingRootCauseAnalysis.rcaFishbone ||
          existingRootCauseAnalysis.rcaFiveWhySteps?.length > 0)
      ) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_059'),
        );
      }
      // Handle method
      if (updateRootCauseAnalysisDto.method) {
        updateData.method = updateRootCauseAnalysisDto.method as any;
      }

      let newlyAddedPerformers: User[] = [];
      if (updateRootCauseAnalysisDto.performed_by_ids !== undefined) {
        const existingPerformerIdsSet = new Set(
          (existingRootCauseAnalysis.rootCauseAnalysisPerformers || [])
            .map((performer: any) => performer.user?.id || performer.userId)
            .filter(Boolean),
        );
        const incomingPerformerIds =
          updateRootCauseAnalysisDto.performed_by_ids || [];
        const newlyAddedPerformerIds = incomingPerformerIds.filter(
          (id) => !existingPerformerIdsSet.has(id),
        );

        let performers: User[] = [];
        if (updateRootCauseAnalysisDto.performed_by_ids.length > 0) {
          const users: User[] = await this.userService.findAllBy(
            {
              id: In(updateRootCauseAnalysisDto.performed_by_ids),
            },
            [],
          );

          if (
            users.length !== updateRootCauseAnalysisDto.performed_by_ids.length
          ) {
            throw new BadRequestException(
              nonConformityHttpError('NON_CONFORMITY_058'),
            );
          }

          performers = users;

          if (newlyAddedPerformerIds.length > 0) {
            newlyAddedPerformers = users.filter((u) =>
              newlyAddedPerformerIds.includes(u.id),
            );
          }
        }

        updateData.rootCauseAnalysisPerformers = performers.map((performer) =>
          this.rootCauseAnalysisPerformerRepository.create({
            rootCauseAnalysis: existingRootCauseAnalysis,
            user: performer,
          }),
        );
      }

      // Handle performed_at
      if (updateRootCauseAnalysisDto.performed_at !== undefined) {
        updateData.performedAt = updateRootCauseAnalysisDto.performed_at;
      }

      // Handle problem_statement
      if (updateRootCauseAnalysisDto.problem_statement) {
        updateData.problemStatement =
          updateRootCauseAnalysisDto.problem_statement;
      }

      // Handle description
      if (updateRootCauseAnalysisDto.description !== undefined) {
        updateData.description = updateRootCauseAnalysisDto.description;
      }

      // Update timestamp
      updateData.updatedAt = Date.now();

      // Update the entity with all changes
      Object.assign(existingRootCauseAnalysis, updateData);
      await this.rootCauseAnalysisRepository.save(existingRootCauseAnalysis);

      const updatedRootCauseAnalysis =
        await this.rootCauseAnalysisRepository.findOne({
          where: { id },
          relations: [
            'nc',
            'rootCauseAnalysisPerformers',
            'rootCauseAnalysisPerformers.user',
          ],
        });

      if (!updatedRootCauseAnalysis) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_060'),
        );
      }

      if (
        updateRootCauseAnalysisDto.performed_by_ids !== undefined &&
        newlyAddedPerformers.length > 0
      ) {
        const ncId =
          updatedRootCauseAnalysis.nc?.id || updatedRootCauseAnalysis.ncId;
        if (ncId) {
          await this.notifyRCAPerformers(
            newlyAddedPerformers,
            ncId,
            updatedRootCauseAnalysis.id,
          );
        }
      }

      return this.formatRootCauseAnalysisEntity(updatedRootCauseAnalysis);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async softDeleteRootCauseAnalysis(id: string, user: any): Promise<void> {
    try {
      const rootCauseAnalysis = await this.rootCauseAnalysisRepository.findOne({
        where: {
          id,
          deleted: false,
        },
      });

      if (!rootCauseAnalysis) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
      }

      rootCauseAnalysis.deleted = true;
      await this.rootCauseAnalysisRepository.save(rootCauseAnalysis);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  // Fishbone Analysis Methods
  async createFishbone(
    ncId: string,
    createFishboneDto: CreateFishboneDto,
    user: any,
  ): Promise<RCAFishbone> {
    try {
      const { effectStatement, categories } = createFishboneDto;

      // Check if RCA exists
      const rca = await this.rootCauseAnalysisRepository.findOne({
        where: { ncId, deleted: false },
      });

      if (!rca) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
      }
      const rootCauseAnalysisId = rca.id;
      // Check if fishbone already exists for this RCA
      const existingFishbone = await this.rcaFishboneRepository.findOne({
        where: { rootCauseAnalysisId },
      });

      if (existingFishbone) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_061'),
        );
      }

      const fishbone = await this.rcaFishboneRepository.save(
        this.rcaFishboneRepository.create({
          rootCauseAnalysisId,
          categories,
          effectStatement,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );

      // Ensure CE categories exist for this RCA (default 6 if none)
      let ceCategories = await this.rcaCeCategoryRepository.find({
        where: { rootCauseAnalysisId, deleted: false },
        relations: ['rcaCeCauses'],
        order: { displayOrder: 'ASC' },
      });
      if (!ceCategories.length) {
        const defaultNames = [
          'Manpower',
          'Method',
          'Machine',
          'Material',
          'Measurement',
          'Environment',
        ];
        const defaults = defaultNames.map((name, index) =>
          this.rcaCeCategoryRepository.create({
            name,
            displayOrder: index,
            rootCauseAnalysisId,
            createdBy: { id: user.id } as User,
            createdById: user.id,
            createdAt: Date.now(),
          }),
        );
        ceCategories = await this.rcaCeCategoryRepository.save(defaults);
      }

      // If categories provided in DTO, add top-level causes under matching CE categories by name
      if (categories?.length) {
        const byName = new Map(ceCategories.map((c) => [c.name, c]));
        for (const cat of categories) {
          const match = byName.get(cat.name);
          if (!match) continue;
          // Clear existing causes under this category safely: break parent links first
          await this.rcaCeCauseRepository.update(
            { rcaCeCategory: { id: match.id } as any },
            { parentId: null },
          );
          await this.rcaCeCauseRepository.delete({
            rcaCeCategory: { id: match.id } as any,
          });
          if (cat.causes?.length) {
            await this.createRcaCeCauseSubtree(match.id, cat.causes, user);
          }
        }
      }

      return fishbone;
    } catch (error: any) {
      this.logger.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_073', { cause: error }),
      );
    }
  }

  async updateFishbone(
    id: string,
    updateFishboneDto: UpdateFishboneDto,
    user: any,
  ): Promise<RCAFishbone> {
    try {
      const fishbone = await this.rcaFishboneRepository.findOne({
        where: { id },
        relations: ['rootCauseAnalysis'],
      });

      if (!fishbone) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_062'));
      }

      // Update fields
      if (updateFishboneDto.effectStatement !== undefined) {
        fishbone.effectStatement = updateFishboneDto.effectStatement;
      }
      if (updateFishboneDto.categories !== undefined) {
        // Apply causes to CE categories by name under same RCA
        const ceCategories = await this.rcaCeCategoryRepository.find({
          where: {
            rootCauseAnalysisId: fishbone.rootCauseAnalysisId,
            deleted: false,
          },
          relations: ['rcaCeCauses'],
        });
        const byName = new Map(ceCategories.map((c) => [c.name, c]));
        for (const cat of updateFishboneDto.categories || []) {
          const match = byName.get(cat.name);
          if (!match) continue;
          // Break parent links first to satisfy FK constraints, then delete
          await this.rcaCeCauseRepository.update(
            { rcaCeCategory: { id: match.id } as any },
            { parentId: null },
          );
          await this.rcaCeCauseRepository.delete({
            rcaCeCategory: { id: match.id } as any,
          });
          if (cat.causes?.length) {
            await this.createRcaCeCauseSubtree(match.id, cat.causes, user);
          }
        }
      }
      fishbone.updatedAt = Date.now();

      return await this.rcaFishboneRepository.save(fishbone);
    } catch (error: any) {
      this.logger.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_074', { cause: error }),
      );
    }
  }

  // Investigation Methods
  async createInvestigation(
    createInvestigationDto: CreateInvestigationDto,
    user: any,
  ): Promise<InvestigationResponseDTO> {
    try {
      const { nc_id, action, root_ca_id } = createInvestigationDto;

      // Check if NC exists
      const nc = await this.nonConformityRepository.findOne({
        where: { id: nc_id, },
      });

      if (!nc) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_036'));
      }

      this.assertNcMutable(nc);

      // Check if an investigation already exists for this NC
      const existingInvestigation = await this.investigationRepository.findOne({
        where: { nc: { id: nc_id }, },
      });

      if (existingInvestigation) {
        throw new BadRequestException(
          nonConformityHttpError('NON_CONFORMITY_066'),
        );
      }

      const investigation = this.investigationRepository.create({
        nc,
        action: action === 'none' ? null : (action as any),
        rootCA: root_ca_id ? { id: root_ca_id } : null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const savedInvestigation =
        await this.investigationRepository.save(investigation);

      // Fetch with relations
      const result = await this.investigationRepository.findOne({
        where: { id: savedInvestigation.id },
        relations: ['nc', 'rootCA'],
      });

      if (!result) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_065'));
      }
      return this.formatInvestigationEntity(result);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllInvestigations(
    ncId: string,
    user: any,
  ): Promise<InvestigationResponseDTO[]> {
    try {
      const { hasPermission } =
        await this.permissionService.hasPermissions(user, 'investigations', [
          'read',
        ]);

      if (!hasPermission) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_064'));
      }

      const investigations = await this.investigationRepository.find({
        where: {
          nc: { id: ncId },
        },
        relations: ['nc', 'rootCA'],
        order: { createdAt: 'DESC' },
      });

      return investigations.map((investigation) =>
        this.formatInvestigationEntity(investigation),
      );
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneInvestigation(
    id: string,
    user: any,
  ): Promise<InvestigationResponseDTO> {
    try {
      const investigation = await this.investigationRepository.findOne({
        where: {
          id,
        },
        relations: ['nc', 'rootCA'],
      });

      if (!investigation) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_065'));
      }

      return this.formatInvestigationEntity(investigation);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateInvestigation(
    id: string,
    updateInvestigationDto: UpdateInvestigationDto,
    user: any,
  ): Promise<InvestigationResponseDTO> {
    try {
      const existingInvestigation = await this.investigationRepository.findOne({
        where: { id, },
        relations: ['nc'],
      });

      if (!existingInvestigation) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_065'));
      }

      this.assertNcMutable(existingInvestigation.nc);

      // Check if root cause analysis exists (if provided)
      if (updateInvestigationDto.root_ca_id) {
        const rootCA = await this.rootCauseAnalysisRepository.findOne({
          where: {
            id: updateInvestigationDto.root_ca_id,
            deleted: false,
          },
        });

        if (!rootCA) {
          throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
        }
      }

      const updateData: any = { ...updateInvestigationDto };
      if (updateData.action !== undefined) {
        updateData.action = updateData.action;
      }
      await this.investigationRepository.update(id, updateData);

      const updatedInvestigation = await this.investigationRepository.findOne({
        where: { id },
        relations: ['nc', 'rootCA'],
      });

      if (!updatedInvestigation) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_065'));
      }
      return this.formatInvestigationEntity(updatedInvestigation);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteInvestigation(id: string, user: any): Promise<void> {
    try {
      const investigation = await this.investigationRepository.findOne({
        where: {
          id,
        },
        relations: ['nc'],
      });

      if (!investigation) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_065'));
      }

      this.assertNcMutable(investigation.nc);

      await this.investigationRepository.remove(investigation);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  // Investigation Evidence Methods
  async createInvestigationEvidence(
    createInvestigationEvidenceDto: CreateInvestigationEvidenceDto,
    user: any,
    file?: any,
  ): Promise<InvestigationEvidenceResponseDTO> {
    try {
      const { investigation_id } = createInvestigationEvidenceDto;

      // Check if investigation exists
      const investigation = await this.investigationRepository.findOne({
        where: { id: investigation_id, },
      });

      if (!investigation) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_065'));
      }

      await this.assertNcMutableById(investigation.ncId);

      // Upload file to S3 if provided
      let fileUrl: string;
      if (file) {
        fileUrl = await this.fileService.uploadFile(file);
      } else {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_068'));
      }

      const investigationEvidence = this.investigationEvidenceRepository.create(
        {
          investigation: { id: investigation_id },
          fileUrl: fileUrl,
          uploadedBy: { id: user.id },
          uploadedAt: Date.now(),
          updatedAt: Date.now(),
        },
      );

      const savedInvestigationEvidence =
        await this.investigationEvidenceRepository.save(investigationEvidence);

      // Fetch with relations
      const result = await this.investigationEvidenceRepository.findOne({
        where: { id: savedInvestigationEvidence.id },
        relations: ['investigation', 'uploadedBy'],
      });

      if (!result) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_067'));
      }
      return this.formatInvestigationEvidenceEntity(result);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllInvestigationEvidence(
    investigationId: string,
    user: any,
  ): Promise<InvestigationEvidenceResponseDTO[]> {
    try {
      const investigationEvidence =
        await this.investigationEvidenceRepository.find({
          where: {
            investigation: { id: investigationId },
          },
          relations: ['investigation', 'uploadedBy'],
          order: { uploadedAt: 'DESC' },
        });

      return investigationEvidence.map((evidence) =>
        this.formatInvestigationEvidenceEntity(evidence),
      );
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findOneInvestigationEvidence(
    id: string,
    user: any,
  ): Promise<InvestigationEvidenceResponseDTO> {
    try {
      const investigationEvidence =
        await this.investigationEvidenceRepository.findOne({
          where: {
            id,
          },
          relations: ['investigation', 'uploadedBy'],
        });

      if (!investigationEvidence) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_067'));
      }

      return this.formatInvestigationEvidenceEntity(investigationEvidence);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async updateInvestigationEvidence(
    id: string,
    updateInvestigationEvidenceDto: UpdateInvestigationEvidenceDto,
    user: any,
    file?: any,
  ): Promise<InvestigationEvidenceResponseDTO> {
    try {
      const existingInvestigationEvidence =
        await this.investigationEvidenceRepository.findOne({
          where: { id, },
        });

      if (!existingInvestigationEvidence) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_067'));
      }

      const updateData: any = { ...updateInvestigationEvidenceDto };

      // Handle file upload if provided
      if (file) {
        // Delete old file from S3 if it exists
        // if (existingInvestigationEvidence.fileUrl) {
        //   try {
        //     await this.fileService.deleteFile(existingInvestigationEvidence.fileUrl);
        //   } catch (error: any) {
        //     this.logger.warn(`Failed to delete old file from S3: ${error.message}`);
        //   }
        // }

        // Upload new file
        updateData.fileUrl = await this.fileService.uploadFile(file);
      } else if (updateData.file_url) {
        updateData.fileUrl = updateData.file_url;
        delete updateData.file_url;
      }

      await this.investigationEvidenceRepository.update(id, updateData);

      const updatedInvestigationEvidence =
        await this.investigationEvidenceRepository.findOne({
          where: { id },
          relations: ['investigation', 'uploadedBy'],
        });

      if (!updatedInvestigationEvidence) {
        throw new NotFoundException(nonConformityHttpError('NON_CONFORMITY_067'));
      }
      return this.formatInvestigationEvidenceEntity(
        updatedInvestigationEvidence,
      );
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async deleteInvestigationEvidence(id: string, user: any): Promise<void> {
    try {
      const investigationEvidence =
        await this.investigationEvidenceRepository.findOne({
          where: {
            id,
          },
        });

      if (!investigationEvidence) {
        throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_067'));
      }

      // Delete file from S3 if it exists
      if (investigationEvidence.fileUrl) {
        try {
          await this.fileService.deleteFile(investigationEvidence.fileUrl);
        } catch (error: any) {
          this.logger.warn(`Failed to delete file from S3: ${error.message}`);
          // Continue with database deletion even if S3 deletion fails
        }
      }

      await this.investigationEvidenceRepository.remove(investigationEvidence);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async findAllRCAFiveWhySteps(
    user: any,
    rcaId: string,
  ): Promise<RCAResponseDTO[]> {
    try {
      const query =
        this.rcaFiveWhyStepRepository.createQueryBuilder('rcaFiveWhyStep');
      query.leftJoinAndSelect('rcaFiveWhyStep.rca', 'rca');
      query.where('rca.id = :rcaId', { rcaId });
      const response = await query.getMany();
      return response.map(this.formatRCAFiveWhyStepEntity);
    } catch (error: any) {
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    }
  }

  async bulkCreateRCAFiveWhySteps(
    bulkCreateRCAFiveWhyStepDto: BulkCreateRCAFiveWhyStepDto,
    user: any,
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    errors: string[];
  }> {
    const { rcaId, steps } = bulkCreateRCAFiveWhyStepDto;
    const queryRunner =
      this.rcaFiveWhyStepRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Fetch existing steps for this RCA
      const existingSteps = await queryRunner.manager.find(RCAFiveWhyStep, {
        where: { rca: { id: rcaId }, },
      });

      // Map existing steps by id and stepNumber
      const existingStepMapById = new Map<string, RCAFiveWhyStep>();
      const existingStepMapByNumber = new Map<number, RCAFiveWhyStep>();
      existingSteps.forEach((step) => {
        existingStepMapById.set(step.id, step);
        existingStepMapByNumber.set(step.stepNumber, step);
      });

      // Track which existing step IDs are being kept (updated or left as-is)
      const keptStepIds = new Set<string>();
      let created = 0;
      let updated = 0;
      let deleted = 0;
      const errors: string[] = [];

      // Process input steps
      for (const stepDto of steps) {
        // Check if this is an update (has id) or create (no id)
        if (stepDto.id) {
          // This is an update - check if the id exists
          const existingById = existingStepMapById.get(stepDto.id);
          if (existingById) {
            // Update existing step by id
            await queryRunner.manager.update(RCAFiveWhyStep, existingById.id, {
              ...stepDto,
              rca: { id: rcaId } as any,
            });
            keptStepIds.add(existingById.id);
            updated++;
          } else {
            // ID provided but not found - treat as create
            const entity = this.rcaFiveWhyStepRepository.create({
              ...stepDto,
              id: undefined, // Remove the invalid id
              rca: { id: rcaId } as any,
            });
            await queryRunner.manager.save(RCAFiveWhyStep, entity);
            created++;
            errors.push(
              `Step with id ${stepDto.id} not found, created new step instead`,
            );
          }
        } else {
          // This is a create - check if stepNumber already exists
          const existingByNumber =
            stepDto.stepNumber == null
              ? undefined
              : existingStepMapByNumber.get(stepDto.stepNumber);
          if (existingByNumber) {
            // Step number already exists - update it
            await queryRunner.manager.update(
              RCAFiveWhyStep,
              existingByNumber.id,
              {
                ...stepDto,
                rca: { id: rcaId } as any,
              },
            );
            keptStepIds.add(existingByNumber.id);
            updated++;
          } else {
            // Create new step
            const entity = this.rcaFiveWhyStepRepository.create({
              ...stepDto,
              rca: { id: rcaId } as any,
            });
            await queryRunner.manager.save(RCAFiveWhyStep, entity);
            created++;
          }
        }
      }

      // Delete steps not being kept
      const toDelete = existingSteps.filter((s) => !keptStepIds.has(s.id));
      for (const step of toDelete) {
        await queryRunner.manager.remove(RCAFiveWhyStep, step);
        deleted++;
      }

      await queryRunner.commitTransaction();
      return { created, updated, deleted, errors };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      this.throwNcCatalogOrRethrowHttp(error);
    } finally {
      await queryRunner.release();
    }
  }

  formatRCAFiveWhyStepEntity(entity: RCAFiveWhyStep): RCAResponseDTO {
    return {
      id: entity.id,
      rcaId: entity.rca ? entity.rca.id : '',
      stepNumber: entity.stepNumber,
      whyQuestion: entity.whyQuestion,
      becauseAnswer: entity.becauseAnswer,
    };
  }
  // RCA CE Methods
  async bulkCreateRCACeCategory(
    ncId: string,
    rcaCeCategoriesData: BulkCreateRCACeCategoryDto,
    user: User,
  ): Promise<void> {
    const { categories } = rcaCeCategoriesData;
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new BadRequestException(
        nonConformityHttpError('NON_CONFORMITY_069'),
      );
    }
    const rca = await this.rootCauseAnalysisRepository.findOne({
      where: {
        ncId,
        deleted: false,
      },
    });
    if (!rca) throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
    const rcaId = rca.id;
    for (const categoryDto of categories) {
      let category;
      if (categoryDto.id) {
        category = await this.rcaCeCategoryRepository.findOne({
          where: { id: categoryDto.id, rootCauseAnalysisId: rcaId },
          relations: ['rcaCeCauses'],
        });
      }

      if (category) {
        category.name = categoryDto.name;
        category.rootCauseAnalysis = rca;

        category.rcaCeCauses = (categoryDto.causes || []).map((causeDto) => ({
          id: causeDto.id,
          text: causeDto.text,
          createdBy: { id: user.id } as User,
          createdById: user.id,
          createdAt: Date.now(),
        }));
        await this.rcaCeCategoryRepository.save(category);
      } else {
        const newCategory = this.rcaCeCategoryRepository.create({
          name: categoryDto.name,
          rootCauseAnalysisId: rcaId,
          rootCauseAnalysis: rca,
          createdBy: { id: user.id } as User,
          createdById: user.id,
          createdAt: Date.now(),
          rcaCeCauses: (categoryDto.causes || []).map((causeDto) => ({
            text: causeDto.text,
            createdBy: { id: user.id } as User,
            createdById: user.id,
            createdAt: Date.now(),
          })),
        });
        await this.rcaCeCategoryRepository.save(newCategory);
      }
    }
  }

  async findAllRCACeCategory(
    ncId: string,
    user: User,
  ): Promise<RCACeCategoryResponseDTO[]> {
    const rca = await this.rootCauseAnalysisRepository.findOne({
      where: { ncId, deleted: false },
    });
    if (!rca) {
          throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_070'));
    }
    const rcaId = rca.id;
    const categories = await this.rcaCeCategoryRepository.find({
      where: { rootCauseAnalysisId: rcaId, deleted: false },
      order: { displayOrder: 'ASC' },
    });

    if (!categories.length) return [];

    const categoryIds = categories.map((c) => c.id);
    const allCauses = await this.rcaCeCauseRepository.find({
      where: { rcaCeCategory: { id: In(categoryIds) } as any, deleted: false },
      relations: ['rcaCeCategory'],
      order: { displayOrder: 'ASC' },
    });

    const byCategory: Record<string, RCACeCause[]> = {};
    for (const cause of allCauses) {
      const catId = (cause.rcaCeCategory as any)?.id;
      if (!byCategory[catId]) byCategory[catId] = [];
      byCategory[catId].push(cause);
    }

    return categories.map((category) => {
      const causes = byCategory[category.id] || [];
      const nodeMap = new Map<
        string,
        { id: string; text: string; children?: any[]; parentId?: string | null }
      >();
      for (const c of causes) {
        nodeMap.set(c.id, {
          id: c.id,
          text: c.text,
          children: [],
          parentId: c.parentId || null,
        });
      }
      const roots: any[] = [];
      for (const c of causes) {
        const node = nodeMap.get(c.id)!;
        if (c.parentId && nodeMap.has(c.parentId)) {
          const parent = nodeMap.get(c.parentId)!;
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return {
        id: category.id,
        name: category.name,
        causes: roots,
      };
    });
  }

  async deleteRCACeCategory(id: string, user: User): Promise<void> {
    const category = await this.rcaCeCategoryRepository.findOne({
      where: { id, deleted: false },
    });
    if (!category) throw new BadRequestException(nonConformityHttpError('NON_CONFORMITY_005'));
    category.deleted = true;
    await this.rcaCeCategoryRepository.save(category);
  }

  // Format Entity Methods
  private formatRootCauseAnalysisEntity(
    entity: RootCauseAnalysis,
  ): RootCauseAnalysisResponseDTO {
    return {
      id: entity.id,
      nc_id: entity.nc?.id || entity.ncId,
      nc: entity.nc
        ? {
            id: entity.nc.id,
            problemStatement: entity.nc.problemStatement,
            status: entity.nc.status,
          }
        : undefined,
      method: entity.method,
      performed_by:
        entity.rootCauseAnalysisPerformers?.map((performer) => ({
          id: performer.user.id,
          fname: performer.user.fname,
          lname: performer.user.lname,
          email: performer.user.email,
        })) || [],
      performed_at: entity.performedAt,
      problem_statement: entity.problemStatement,
      description: entity.description,
      created_at: entity.createdAt,
      fiveWhySteps: entity.rcaFiveWhySteps?.map(
        this.formatRCAFiveWhyStepEntity,
      ),
      rcaCeCategories:
        entity.rcaCeCategories?.map((category) => ({
          id: category.id,
          name: category.name,
          causes:
            category.rcaCeCauses?.map((cause) => ({
              id: cause.id,
              text: cause.text,
            })) || [],
        })) || [],
      rcaFishbone: entity.rcaFishbone
        ? {
            id: entity.rcaFishbone.id,
            rootCauseAnalysisId: entity.rcaFishbone.rootCauseAnalysisId,
            effectStatement: entity.rcaFishbone.effectStatement,
            categories:
              (entity.rcaCeCategories || []).map((c) => ({
                name: c.name,
                causes: (c.rcaCeCauses || []).map((cause) => ({
                  text: cause.text,
                })),
              })) || [],
          }
        : undefined,
    };
  }

  private formatInvestigationEntity(
    entity: Investigation,
  ): InvestigationResponseDTO {
    return {
      id: entity.id,
      nc_id: entity.nc.id,
      nc: {
        id: entity.nc.id,
        problemStatement: entity.nc.problemStatement,
        status: entity.nc.status,
      },
      action: entity.action,
      root_ca: entity.rootCA
        ? {
            id: entity.rootCA.id,
            method: entity.rootCA.method,
            problem_statement: entity.rootCA.problemStatement,
          }
        : undefined,
      created_at: entity.createdAt,
    };
  }

  private formatInvestigationEvidenceEntity(
    entity: InvestigationEvidence,
  ): InvestigationEvidenceResponseDTO {
    return {
      id: entity.id,
      investigation_id: entity.investigation.id,
      investigation: {
        id: entity.investigation.id,
        action: entity.investigation.action,
        nc_id: entity.investigation.nc?.id,
      },
      file_url: entity.fileUrl,
      uploaded_by: {
        id: entity.uploadedBy.id,
        fname: entity.uploadedBy.fname,
        lname: entity.uploadedBy.lname,
        email: entity.uploadedBy.email,
      },
      uploaded_at: entity.uploadedAt,
    };
  }
  private mapCorrectiveActionMessage(method: string): string {
    switch (method) {
      case 'createCorrectiveAction':
      case 'createNCCorrectiveAction':
        return 'created a new non-conformity corrective action';
      case 'updateCorrectiveAction':
      case 'updateNCCorrectiveAction':
        return 'updated a non-conformity corrective action';
      default:
        return 'modified a non-conformity corrective action';
    }
  }

  // Immediate Action Evidence Methods
  async createImmediateActionEvidence(
    immediate_action_id: string,
    user: any,
    file?: any,
  ): Promise<{ id: string }> {
    await this.assertImmediateActionNcMutable(immediate_action_id, user);
    return await this.immediateActionCommonService.createImmediateActionEvidence(
      immediate_action_id,
      user,
      file,
    );
  }

  async deleteImmediateActionEvidence(id: string, user: any): Promise<void> {
    await this.immediateActionCommonService.deleteImmediateActionEvidence(
      id,
      user,
    );
  }

  async createImmediateActionComment(
    immediateActionId: string,
    text: string,
    user: any,
  ): Promise<{ id: string }> {
    await this.assertImmediateActionNcMutable(immediateActionId, user);
    return this.immediateActionCommonService.createImmediateActionComment(
      immediateActionId,
      text,
      user,
    );
  }

  async deleteImmediateActionComment(id: string, user: any): Promise<void> {
    await this.immediateActionCommonService.deleteImmediateActionComment(
      id,
      user,
    );
  }
}
