import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  Repository,
  In,
  Not,
  QueryRunner,
  IsNull,
  QueryDeepPartialEntity,
} from 'typeorm';

import { storedEvidenceUrl } from './evidence-file';
import { AuditPersonnel } from './entities/audit-personnel.entity';
import { AuditRole } from './entities/audit-role.entity';
import { AuditDocumentType } from './entities/document-type.entity';
import { AuditTeamMember } from './entities/audit-team-member.entity';
import {
  AuditPersonnelDto,
  CreateAuditRoleDto,
  UpdateAuditRoleDto,
  CreateAuditDocumentTypeDto,
  UpdateAuditDocumentTypeDto,
  CreateAuditProgramDto,
  UpdateAuditProgramDto,
  CreateChecklistDefinitionDto,
  UpdateChecklistDefinitionDto,
  ChecklistDefinitionResponseDto,
  ChecklistSectionDefinitionResponseDto,
  ChecklistQuestionDefinitionResponseDto,
  CreateAuditInstanceDto,
  UpdateAuditInstanceDto,
  AuditInstanceResponseDto,
  AuditTeamMemberDTO,
  CreateAuditReportDto,
  UpdateAuditReportDto,
  AuditReportResponseDto,
  AuditInstanceAttachmentResponseDto,
  AuditChecklistResponseDto,
  AuditChecklistResponsesGroupedDto,
  BulkCreateUpdateAuditChecklistResponseDto,
  CreateAuditFindingDto,
  UpdateAuditFindingDto,
  AuditFindingResponseDTO,
  AuditFindingDetailResponseDTO,
  AllAuditInstanceResponseDto,
  CreateAuditProgramScheduleEntryDto,
} from './dtos';
import { AuditActivityType } from './entities/audit-activity-type.entity';
import { ChecklistDefinition } from './entities/checklist-definition.entity';
import { ChecklistDefinitionTeam } from './entities/checklist-definition-team.entity';
import {
  ChecklistDefinitionVersion,
  ChecklistVersionStatus,
} from './entities/checklist-definition-version.entity';
import { ChecklistSectionDefinition } from './entities/checklist-section-definition.entity';
import { ChecklistQuestionDefinition } from './entities/checklist-question-definition.entity';
import { AuditChecklistResponse } from './entities/audit-checklist-response.entity';
import { TeamService } from '../teams/team.service';
import { Team } from '../teams/team.entity';
import {
  AddAuditActivityTypeDto,
  AddStandardDto,
  AuditActivityTypeDto,
  UpdateAuditActivityTypeDto,
  StandardDto,
  AuditProgramDto,
} from './dtos';

import { UserRequest } from '../permissions/dto';
import { PaginatedResponse, PaginationParams } from '../common/pagination';
import { User } from '../user/user.entity';
import {
  AuditProgram,
  AuditProgramStatus,
} from './entities/audit-program.entity';
import { AuditInstance } from './entities/audit-instance.entity';
import { AuditInstanceAttachment } from './entities/audit-instance-attachment.entity';
import { File as StoredFile } from '../common/file.entity';
import { AuditProgramStandard } from './entities/audit-program-standard.entity';
import { AuditReport, AuditReportType } from './entities/audit-report.entity';
import { PermissionService } from '../permissions/permission.service';
import { auditProgramPermission } from '../permissions/permissions';
import { LocalFileService } from '../common/local-file.service';
import { AuditFinding } from './entities/audit-finding.entity';
import {
  AuditFindingEvidence,
  AuditFindingEvidenceType,
} from './entities/audit-finding-evidence.entity';
import { Document } from '../document/document.entity';
import { NonConformity } from '../non-conformities/entities/non-conformity.entity';
import { NotificationInfo } from '../notification/notification-handler/notification.interface';
import {
  NotificationInfoParam,
  NotificationInfoResponse,
  NotificationRecipient,
} from '../notification/notification-handler/dto';

import { QueuePublisher } from '../queue/queue.publisher';
import { EmailType } from '../common/dto';
import { AuditInstanceStatus } from './entities/audit-instance.entity';
import { AuditInstanceChecklistVersion } from './entities/audit-instance-checklist-versions.entity';
import { auditHttpError } from './audit.errors';
import { AuditProgramScheduleEntry } from './entities/audit-program-schedule-entry.entity';
import { Standard } from './entities/standard.entity';
import { StandardImplementation } from '../standards/standard-implementation.entity';
import { getStandard } from '../standards/standards.catalog';
import { UsersService } from '../user/user.service';
import {
  defaultAuditRoles,
  defaultAuditTypes,
  type DefaultAuditConfigItem,
} from './audit.config';
import { AuditPersonnelQueryDto } from './audit.responses';

type DefaultAuditCatalogRow = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
};

@Injectable()
export class AuditService implements NotificationInfo, OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private auditDefaultsReady = false;

  constructor(
    @InjectRepository(AuditPersonnel)
    private readonly auditPersonnelRepository: Repository<AuditPersonnel>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditRole)
    private readonly auditRoleRepository: Repository<AuditRole>,
    @InjectRepository(AuditActivityType)
    private readonly auditActivityTypeRepository: Repository<AuditActivityType>,
    @InjectRepository(AuditDocumentType)
    private readonly auditDocumentTypeRepository: Repository<AuditDocumentType>,
    @InjectRepository(AuditProgram)
    private readonly auditProgramRepository: Repository<AuditProgram>,
    @InjectRepository(AuditInstance)
    private readonly auditInstanceRepository: Repository<AuditInstance>,
    @InjectRepository(Standard)
    private readonly standardRepository: Repository<Standard>,
    @InjectRepository(StandardImplementation)
    private readonly implementationRepository: Repository<StandardImplementation>,
    @InjectRepository(AuditProgramScheduleEntry)
    private readonly auditProgramScheduleEntryRepository: Repository<AuditProgramScheduleEntry>,
    @InjectRepository(AuditReport)
    private readonly auditReportRepository: Repository<AuditReport>,
    @InjectRepository(AuditInstanceAttachment)
    private readonly auditInstanceAttachmentRepository: Repository<AuditInstanceAttachment>,
    @InjectRepository(StoredFile)
    private readonly fileRepository: Repository<StoredFile>,
    @InjectRepository(ChecklistDefinition)
    private readonly checklistDefinitionRepository: Repository<ChecklistDefinition>,
    @InjectRepository(ChecklistDefinitionVersion)
    private readonly checklistDefinitionVersionRepository: Repository<ChecklistDefinitionVersion>,
    @InjectRepository(ChecklistSectionDefinition)
    private readonly checklistSectionDefinitionRepository: Repository<ChecklistSectionDefinition>,
    @InjectRepository(ChecklistQuestionDefinition)
    private readonly checklistQuestionDefinitionRepository: Repository<ChecklistQuestionDefinition>,
    @InjectRepository(AuditChecklistResponse)
    private readonly auditChecklistResponseRepository: Repository<AuditChecklistResponse>,
    @InjectRepository(AuditFinding)
    private readonly auditFindingRepository: Repository<AuditFinding>,
    @InjectRepository(ChecklistDefinitionTeam)
    private readonly checklistDefinitionTeamRepository: Repository<ChecklistDefinitionTeam>,
    @InjectRepository(AuditTeamMember)
    private readonly auditTeamMemberRepository: Repository<AuditTeamMember>,
    private readonly teamService: TeamService,
    private readonly permissionService: PermissionService,
    private readonly fileService: LocalFileService,
    private readonly queuePublisher: QueuePublisher,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.ensureAuditDefaults();
  }

  private async ensureAuditDefaults(): Promise<void> {
    if (this.auditDefaultsReady) return;

    const typesReady = await this.ensureCatalog(
      this.auditActivityTypeRepository,
      defaultAuditTypes,
      (item, timestamp) =>
        this.auditActivityTypeRepository.create({
          name: item.name,
          description: item.description,
          createdAt: timestamp,
          deleted: false,
          isDefault: true,
        }),
    );
    const rolesReady = await this.ensureCatalog(
      this.auditRoleRepository,
      defaultAuditRoles,
      (item, timestamp) =>
        this.auditRoleRepository.create({
          name: item.name,
          description: item.description,
          createdAt: timestamp,
          updatedAt: timestamp,
          deleted: false,
          isDefault: true,
        }),
    );
    this.auditDefaultsReady = typesReady && rolesReady;
  }

  private async ensureCatalog<T extends DefaultAuditCatalogRow>(
    repository: Repository<T>,
    items: DefaultAuditConfigItem[],
    build: (item: DefaultAuditConfigItem, timestamp: number) => T,
  ): Promise<boolean> {
    const base = Date.now();
    let missing = false;

    for (const [index, item] of items.entries()) {
      try {
        const existing = await this.findActiveCatalogRow(repository, item.name);
        if (existing) {
          await this.keepCatalogRow(repository, existing, item);
          continue;
        }

        const timestamp = base + (items.length - index);
        await repository.save(build(item, timestamp));
        this.logger.log(`Created default audit catalog item ${item.name}`);
      } catch (error) {
        const raced = await this.findActiveCatalogRow(repository, item.name);
        if (raced) {
          try {
            await this.keepCatalogRow(repository, raced, item);
            continue;
          } catch (keepError) {
            this.logger.error(
              `Failed to keep default audit catalog item ${item.name}`,
              keepError,
            );
          }
        }
        missing = true;
        this.logger.error(
          `Failed to create default audit catalog item ${item.name}`,
          error,
        );
      }
    }

    return !missing;
  }

  private findActiveCatalogRow<T extends DefaultAuditCatalogRow>(
    repository: Repository<T>,
    name: string,
  ): Promise<T | null> {
    return repository
      .createQueryBuilder('catalog')
      .where('LOWER(catalog.name) = LOWER(:name)', { name })
      .andWhere('catalog.deleted = :deleted', { deleted: false })
      .getOne();
  }

  private async keepCatalogRow<T extends DefaultAuditCatalogRow>(
    repository: Repository<T>,
    existing: T,
    item: DefaultAuditConfigItem,
  ): Promise<void> {
    const patch: QueryDeepPartialEntity<T> = {};
    if (!existing.isDefault) {
      Object.assign(patch, { isDefault: true });
    }
    if (existing.name !== item.name) {
      Object.assign(patch, { name: item.name });
    }
    if (!existing.description?.trim()) {
      Object.assign(patch, { description: item.description });
    }
    if (Object.keys(patch).length === 0) return;
    await repository.update(existing.id, patch);
  }

  private accessibleTeamIds(user: { teamIds?: number[] }): number[] {
    return Array.isArray(user.teamIds) && user.teamIds.length > 0
      ? user.teamIds
      : [-1];
  }

  private async assertTeamsAccess(
    user: UserRequest,
    teamIds: number[],
    action: string,
  ): Promise<void> {
    const ids = [...new Set(teamIds.map((id) => Number(id)))].filter((id) =>
      Number.isInteger(id),
    );
    if (!ids.length) {
      throw new NotFoundException(auditHttpError('AUDIT_024'));
    }
    const access = await this.permissionService.hasPermissions(
      user,
      auditProgramPermission.subject,
      [action],
    );
    for (const teamId of ids) {
      const team = await this.teamService.findById(teamId);
      if (
        !team ||
        team.deleted ||
        !access.hasPermission ||
        !access.teamIds.includes(teamId)
      ) {
        throw new NotFoundException(auditHttpError('AUDIT_024'));
      }
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
      if (
        !person?.id ||
        !person.email ||
        person.id === actorId ||
        seen.has(person.id)
      ) {
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

  private async usersForTeams(
    teamIds: number[],
    subject: string,
    actorId?: string,
  ): Promise<User[]> {
    const ids = teamIds.filter((id) => id != null);
    return this.permissionService.usersWithAccess(
      ids,
      { id: actorId ?? '', username: '', teamIds: [] },
      subject,
      ids.length === 0,
    );
  }

  private teamIdsFrom(
    links?: Array<{ team?: { id?: number } | null }>,
  ): number[] {
    return (links || [])
      .map((link) => link.team?.id)
      .filter((id): id is number => id != null);
  }

  async findAll(
    user: UserRequest,
    filter: { [key: string]: string },
  ): Promise<AuditRole[]> {
    await this.ensureAuditDefaults();
    const { search, page, limit } = filter;
    const query = this.auditRoleRepository
      .createQueryBuilder('auditRole')
      .leftJoinAndSelect('auditRole.createdBy', 'createdBy')
      .andWhere('auditRole.deleted = false', { deleted: false });
    if (search) {
      query.andWhere('auditRole.name LIKE :search', { search: `%${search}%` });
    }

    query
      .orderBy('auditRole.isDefault', 'DESC')
      .addOrderBy('auditRole.name', 'ASC');
    return query.getMany();
  }

  async findOne(id: string): Promise<AuditRole | null> {
    return this.auditRoleRepository.findOne({
      where: { id, deleted: false },
      relations: ['createdBy'],
    });
  }

  async create(auditRoleData: CreateAuditRoleDto, user): Promise<AuditRole> {
    const name = auditRoleData.name;
    const existingRole = await this.auditRoleRepository
      .createQueryBuilder('auditRole')
      .where('LOWER(auditRole.name) = LOWER(:name)', { name: name })
      .andWhere('auditRole.deleted = false', { deleted: false })
      .getOne();

    if (existingRole) {
      throw new BadRequestException(auditHttpError('AUDIT_001'));
    }

    const auditRole = this.auditRoleRepository.create({
      ...auditRoleData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: { id: user.id },
      isDefault: false,
    });
    return this.auditRoleRepository.save(auditRole);
  }

  async update(
    id: string,
    auditRoleData: UpdateAuditRoleDto,
    user: UserRequest,
  ): Promise<AuditRole> {
    const existingRole = await this.auditRoleRepository.findOne({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException(auditHttpError('AUDIT_002'));
    }

    if (existingRole.isDefault) {
      throw new BadRequestException(auditHttpError('AUDIT_064'));
    }

    const name = auditRoleData.name;
    const duplicateRole = await this.auditRoleRepository
      .createQueryBuilder('auditRole')
      .where('LOWER(auditRole.name) = LOWER(:name)', { name: name })
      .andWhere('auditRole.id != :id', { id: id })
      .andWhere('auditRole.deleted = false', { deleted: false })
      .getOne();

    if (duplicateRole) {
      throw new BadRequestException(auditHttpError('AUDIT_001'));
    }
    existingRole.name = auditRoleData.name ?? existingRole.name;
    existingRole.description =
      auditRoleData.description ?? existingRole.description;
    existingRole.updatedAt = Date.now();
    await this.auditRoleRepository.save(existingRole);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(auditHttpError('AUDIT_002'));
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const existingRole = await this.auditRoleRepository.findOne({
      where: { id, deleted: false },
    });
    if (!existingRole) {
      throw new NotFoundException(auditHttpError('AUDIT_002'));
    }

    if (existingRole.isDefault) {
      throw new BadRequestException(auditHttpError('AUDIT_064'));
    }

    const teamMemberInUse = await this.auditTeamMemberRepository.findOne({
      where: {
        auditRole: { id },
        auditInstanceId: Not(IsNull()),
        auditInstance: {
          deleted: false,
        },
      },
    });

    if (teamMemberInUse) {
      throw new BadRequestException(auditHttpError('AUDIT_003'));
    }

    existingRole.deleted = true;
    existingRole.name = `${existingRole.name}_DELETED_${Date.now()}`;
    await this.auditRoleRepository.save(existingRole);
  }

  async getStandards(
    user: UserRequest,
    filter?: { [key: string]: string },
  ): Promise<Standard[]> {
    const query = this.implementationRepository
      .createQueryBuilder('implementation')
      .select([
        'implementation.id',
        'implementation.standardKey',
        'implementation.standardName',
      ]);

    if (filter?.search) {
      query.andWhere('LOWER(implementation.standardName) LIKE LOWER(:search)', {
        search: `%${filter.search.trim()}%`,
      });
    }

    const implementations = await query
      .orderBy('implementation.standardName', 'ASC')
      .getMany();

    const standards: Standard[] = [];
    for (const implementation of implementations) {
      const standard = await this.standardForImplementation(implementation);
      standards.push({
        id: standard.id,
        name: standard.name,
        description: standard.description,
        isDefault: standard.isDefault,
      } as Standard);
    }
    return standards;
  }

  private async standardForImplementation(
    implementation: Pick<
      StandardImplementation,
      'standardKey' | 'standardName'
    >,
  ): Promise<Standard> {
    const name = implementation.standardName.trim();
    const description = getStandard(implementation.standardKey)?.description;
    const existing = await this.standardRepository
      .createQueryBuilder('standard')
      .where('LOWER(standard.name) = LOWER(:name)', { name })
      .getOne();

    if (existing) {
      const patch: Partial<Standard> = {};
      if (existing.deleted) patch.deleted = false;
      if (existing.name !== name) patch.name = name;
      if (!existing.description?.trim() && description) {
        patch.description = description;
      }
      if (Object.keys(patch).length > 0) {
        await this.standardRepository.update(existing.id, patch);
        Object.assign(existing, patch);
      }
      return existing;
    }

    try {
      return await this.standardRepository.save(
        this.standardRepository.create({
          name,
          description,
          deleted: false,
          isDefault: false,
        }),
      );
    } catch (error) {
      const raced = await this.standardRepository
        .createQueryBuilder('standard')
        .where('LOWER(standard.name) = LOWER(:name)', { name })
        .andWhere('standard.deleted = :deleted', { deleted: false })
        .getOne();
      if (raced) return raced;
      throw error;
    }
  }

  async addStandard(
    user: User,
    addStandardDto: AddStandardDto,
  ): Promise<StandardDto> {
    try {
      if (
        await this.standardRepository
          .createQueryBuilder('standard')
          .where('LOWER(standard.name) = LOWER(:name) and deleted = false', {
            name: addStandardDto.name,
          })
          .getOne()
      ) {
        throw new BadRequestException(auditHttpError('AUDIT_070'));
      }
      const standard = this.standardRepository.create({
        name: addStandardDto.name,
        description: addStandardDto.description,
        deleted: false,
        isDefault: false,
      });
      await this.standardRepository.save(standard);
      return {
        id: standard.id,
        name: standard.name,
        description: standard.description,
        isDefault: standard.isDefault,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(auditHttpError('AUDIT_071'));
    }
  }

  async getActivityTypes(
    user: UserRequest,
    filter?: { [key: string]: string },
  ): Promise<AuditActivityType[]> {
    await this.ensureAuditDefaults();
    const query = this.auditActivityTypeRepository
      .createQueryBuilder('auditActivityType')
      .select([
        'auditActivityType.id',
        'auditActivityType.name',
        'auditActivityType.description',
        'auditActivityType.isDefault',
      ])
      .andWhere('auditActivityType.deleted = :deleted', { deleted: false });
    if (filter?.search) {
      query.andWhere('LOWER(auditActivityType.name) LIKE LOWER(:search)', {
        search: `%${filter.search.trim()}%`,
      });
    }
    query
      .orderBy('auditActivityType.isDefault', 'DESC')
      .addOrderBy('auditActivityType.createdAt', 'DESC');
    return query.getMany();
  }

  async getActivityTypeById(
    user: User,
    id: string,
  ): Promise<AuditActivityTypeDto> {
    const activityType = await this.auditActivityTypeRepository.findOne({
      where: { id: id },
    });
    if (!activityType) {
      throw new NotFoundException(auditHttpError('AUDIT_011'));
    }
    return {
      id: activityType.id,
      name: activityType.name,
      description: activityType.description ?? '',
      isDefault: activityType.isDefault,
    };
  }

  async addActivityType(
    user: User,
    addAuditActivityTypeDto: AddAuditActivityTypeDto,
  ): Promise<AuditActivityTypeDto> {
    try {
      if (
        await this.auditActivityTypeRepository
          .createQueryBuilder('auditActivityType')
          .where(
            'LOWER(auditActivityType.name) = LOWER(:name) and deleted = false',
            {
              name: addAuditActivityTypeDto.name,
            },
          )
          .getOne()
      ) {
        throw new BadRequestException(auditHttpError('AUDIT_009'));
      }
      const activityType = this.auditActivityTypeRepository.create({
        ...addAuditActivityTypeDto,
        createdBy: { id: user.id },
        deleted: false,
        isDefault: false,
        createdAt: Date.now(),
      });
      await this.auditActivityTypeRepository.save(activityType);
      return {
        id: activityType.id,
        name: activityType.name,
        description: activityType.description ?? '',
        isDefault: activityType.isDefault,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(auditHttpError('AUDIT_010'));
    }
  }

  async updateActivityType(
    user: User,
    id: string,
    updateAuditActivityTypeDto: UpdateAuditActivityTypeDto,
  ): Promise<AuditActivityTypeDto> {
    try {
      const activityType = await this.auditActivityTypeRepository.findOne({
        where: { id: id },
      });
      if (!activityType) {
        throw new NotFoundException(auditHttpError('AUDIT_011'));
      }

      if (activityType.isDefault) {
        throw new BadRequestException(auditHttpError('AUDIT_063'));
      }

      if (
        await this.auditActivityTypeRepository
          .createQueryBuilder('auditActivityType')
          .where(
            'LOWER(auditActivityType.name) = LOWER(:name) and deleted = false',
            {
              name: updateAuditActivityTypeDto.name,
            },
          )
          .andWhere('auditActivityType.id != :id', {
            id: id,
          })
          .getOne()
      ) {
        throw new BadRequestException(auditHttpError('AUDIT_009'));
      }
      activityType.name = updateAuditActivityTypeDto.name;
      activityType.description = updateAuditActivityTypeDto.description;
      await this.auditActivityTypeRepository.save(activityType);
      return {
        id: activityType.id,
        name: activityType.name,
        description: activityType.description ?? '',
        isDefault: activityType.isDefault,
      };
    } catch (error) {
      // Re-throw known/expected errors
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(error);
      // Throw generic error for unexpected errors
      throw new BadRequestException(auditHttpError('AUDIT_012'));
    }
  }

  async deleteActivityType(user: User, id: string): Promise<string> {
    const activityType = await this.auditActivityTypeRepository.findOne({
      where: { id: id },
    });
    if (!activityType) {
      throw new NotFoundException(auditHttpError('AUDIT_011'));
    }
    if (activityType.isDefault) {
      throw new BadRequestException(auditHttpError('AUDIT_063'));
    }
    const auditProgram = await this.auditProgramRepository.findOne({
      where: {
        auditActivityType: { id: id },
        deleted: false,
      },
    });
    if (auditProgram) {
      throw new BadRequestException(auditHttpError('AUDIT_013'));
    }
    const checklistDefinition =
      await this.checklistDefinitionRepository.findOne({
        where: {
          activityType: { id: id },
          deleted: false,
        },
      });
    if (checklistDefinition) {
      throw new BadRequestException(auditHttpError('AUDIT_014'));
    }
    activityType.deleted = true;
    activityType.name = `${activityType.name}_DELETED_${Date.now()}`;
    await this.auditActivityTypeRepository.save(activityType);
    return 'Audit activity type deleted successfully';
  }

  // Audit Personnel Methods
  private applyLinkedUserProfile(
    auditPersonnel: AuditPersonnel,
    linkedUser: User,
  ): void {
    auditPersonnel.firstName = linkedUser.fname;
    auditPersonnel.lastName = linkedUser.lname;
    auditPersonnel.email = linkedUser.email;
    auditPersonnel.userId = linkedUser.id;
    auditPersonnel.user = linkedUser;
  }

  private hydratePersonnelFromLinkedUser(
    auditPersonnel: AuditPersonnel,
  ): AuditPersonnel {
    if (!auditPersonnel?.isExternal && auditPersonnel?.user) {
      auditPersonnel.firstName = auditPersonnel.user.fname;
      auditPersonnel.lastName = auditPersonnel.user.lname;
      auditPersonnel.email = auditPersonnel.user.email;
    }
    return auditPersonnel;
  }

  private async resolvePersonnelIdentity(
    auditPersonnelDto: AuditPersonnelDto,
    excludePersonnelId?: string,
  ): Promise<{
    isExternal: boolean;
    firstName: string;
    lastName: string;
    email: string;
    userId: string | null;
    linkedUser: User | null;
  }> {
    const isExternal = auditPersonnelDto.isExternal === true;

    if (isExternal) {
      const firstName = (auditPersonnelDto.firstName || '').trim();
      const lastName = (auditPersonnelDto.lastName || '').trim();
      const email = (auditPersonnelDto.email || '').trim();
      if (!firstName || !lastName || !email) {
        throw new BadRequestException(auditHttpError('AUDIT_076'));
      }
      await this.assertExternalEmailNotUsedByUser(email);
      return {
        isExternal: true,
        firstName,
        lastName,
        email,
        userId: null,
        linkedUser: null,
      };
    }

    if (!auditPersonnelDto.userId) {
      throw new BadRequestException(auditHttpError('AUDIT_075'));
    }

    let linkedUser: User;
    try {
      linkedUser = await this.usersService.findBy({
        id: auditPersonnelDto.userId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(auditHttpError('AUDIT_073'));
      }
      throw error;
    }

    const existingForUserQuery = this.auditPersonnelRepository
      .createQueryBuilder('auditPersonnel')
      .where('auditPersonnel.userId = :userId', { userId: linkedUser.id })
      .andWhere('auditPersonnel.deleted = false');
    if (excludePersonnelId) {
      existingForUserQuery.andWhere('auditPersonnel.id != :excludeId', {
        excludeId: excludePersonnelId,
      });
    }
    if (await existingForUserQuery.getOne()) {
      throw new BadRequestException(auditHttpError('AUDIT_074'));
    }

    return {
      isExternal: false,
      firstName: linkedUser.fname,
      lastName: linkedUser.lname,
      email: linkedUser.email,
      userId: linkedUser.id,
      linkedUser,
    };
  }

  private async assertExternalEmailNotUsedByUser(email: string): Promise<void> {
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .andWhere('user.deleted = false')
      .getOne();

    if (existingUser) {
      throw new BadRequestException(auditHttpError('AUDIT_077'));
    }
  }

  private async assertUniquePersonnelEmail(
    email: string,
    excludePersonnelId?: string,
  ): Promise<void> {
    const existingQuery = this.auditPersonnelRepository
      .createQueryBuilder('auditPersonnel')
      .where('LOWER(auditPersonnel.email) = LOWER(:email)', { email })
      .andWhere('auditPersonnel.deleted = false');
    if (excludePersonnelId) {
      existingQuery.andWhere('auditPersonnel.id != :excludeId', {
        excludeId: excludePersonnelId,
      });
    }

    if (await existingQuery.getOne()) {
      throw new BadRequestException(
        auditHttpError(excludePersonnelId ? 'AUDIT_018' : 'AUDIT_015'),
      );
    }
  }

  async createAuditPersonnel(
    auditPersonnelDto: AuditPersonnelDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const identity = await this.resolvePersonnelIdentity(auditPersonnelDto);
      await this.assertUniquePersonnelEmail(identity.email);

      const auditPersonnel = new AuditPersonnel();
      auditPersonnel.isExternal = identity.isExternal;
      auditPersonnel.isActive = auditPersonnelDto.isActive !== false;
      auditPersonnel.createdBy = { id: user.id } as any;

      if (identity.linkedUser) {
        this.applyLinkedUserProfile(auditPersonnel, identity.linkedUser);
      } else {
        auditPersonnel.firstName = identity.firstName;
        auditPersonnel.lastName = identity.lastName;
        auditPersonnel.email = identity.email;
        auditPersonnel.userId = null;
        auditPersonnel.user = null;
      }

      const savedAuditPersonnel =
        await this.auditPersonnelRepository.save(auditPersonnel);
      // Return { id } so HistoryInterceptor can publish entityId for notifications.
      return { id: savedAuditPersonnel.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(auditHttpError('AUDIT_016'));
    }
  }

  async findAllAuditPersonnel(
    user: UserRequest,
    filterDto: AuditPersonnelQueryDto,
  ): Promise<PaginatedResponse<AuditPersonnel>> {
    try {
      const { page, perPage } = filterDto;
      const skip = (Number(page) - 1) * Number(perPage);
      const query =
        this.auditPersonnelRepository.createQueryBuilder('audit_personnel');
      query
        .leftJoinAndSelect('audit_personnel.user', 'user')
        .andWhere('audit_personnel.deleted = false', { deleted: false });

      if (filterDto.isExternal) {
        if (filterDto.isExternal === 'Internal') {
          query.andWhere('audit_personnel.isExternal = :isExternal', {
            isExternal: false,
          });
        } else {
          query.andWhere('audit_personnel.isExternal = :isExternal', {
            isExternal: true,
          });
        }
      }

      if (filterDto.isActive) {
        if (filterDto.isActive === 'Active') {
          query.andWhere('audit_personnel.isActive = :isActive', {
            isActive: true,
          });
        } else {
          query.andWhere('audit_personnel.isActive = :isActive', {
            isActive: false,
          });
        }
      }

      if (filterDto.search) {
        query.andWhere(
          "(LOWER(CONCAT(COALESCE(user.fname, audit_personnel.firstName), ' ', COALESCE(user.lname, audit_personnel.lastName))) LIKE LOWER(:search) OR LOWER(COALESCE(user.email, audit_personnel.email)) LIKE LOWER(:search))",
          { search: `%${filterDto.search}%` },
        );
      }

      const total = await query.getCount();

      const auditPersonnels = await query.skip(skip).take(+perPage).getMany();
      return {
        data: auditPersonnels.map((personnel) =>
          this.hydratePersonnelFromLinkedUser(personnel),
        ),
        currentPage: page,
        totalCount: total,
        perPage,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async findOneAuditPersonnel(id: string): Promise<AuditPersonnel | null> {
    try {
      const auditPersonnel = await this.auditPersonnelRepository.findOne({
        where: {
          id,
          deleted: false,
        },
        relations: ['createdBy', 'user'],
      });
      return auditPersonnel
        ? this.hydratePersonnelFromLinkedUser(auditPersonnel)
        : null;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async updateAuditPersonnel(
    id: string,
    auditPersonnelDto: AuditPersonnelDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const auditPersonnel = await this.findOneAuditPersonnel(id);
      if (!auditPersonnel) {
        throw new NotFoundException(auditHttpError('AUDIT_017'));
      }

      const identity = await this.resolvePersonnelIdentity(
        auditPersonnelDto,
        id,
      );
      await this.assertUniquePersonnelEmail(identity.email, id);

      auditPersonnel.isExternal = identity.isExternal;
      if (identity.linkedUser) {
        this.applyLinkedUserProfile(auditPersonnel, identity.linkedUser);
      } else {
        auditPersonnel.firstName = identity.firstName;
        auditPersonnel.lastName = identity.lastName;
        auditPersonnel.email = identity.email;
        auditPersonnel.userId = null;
        auditPersonnel.user = null;
      }

      // Check if trying to deactivate personnel
      if (auditPersonnel.isActive && auditPersonnelDto.isActive === false) {
        // Check if this personnel is used as a team member in any audit instances
        const teamMemberInUse = await this.auditTeamMemberRepository.findOne({
          where: {
            auditPersonnel: { id },
            auditInstanceId: Not(IsNull()),
            auditInstance: {
              deleted: false,
            },
          },
        });

        if (teamMemberInUse) {
          throw new BadRequestException(auditHttpError('AUDIT_019'));
        }
      }

      auditPersonnel.isActive =
        auditPersonnelDto.isActive ?? auditPersonnel.isActive;
      const updatedAuditPersonnel =
        await this.auditPersonnelRepository.save(auditPersonnel);
      return { id: updatedAuditPersonnel.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async deleteAuditPersonnel(id: string): Promise<{ id: string }> {
    try {
      const auditPersonnel = await this.auditPersonnelRepository.findOne({
        where: { id: id, deleted: false },
      });
      if (!auditPersonnel) {
        throw new NotFoundException(auditHttpError('AUDIT_017'));
      }

      const teamMemberInUse = await this.auditTeamMemberRepository.findOne({
        where: {
          auditPersonnel: { id },
          auditInstanceId: Not(IsNull()),
          auditInstance: {
            deleted: false,
          },
        },
      });

      if (teamMemberInUse) {
        throw new BadRequestException(auditHttpError('AUDIT_020'));
      }

      auditPersonnel.deleted = true;
      auditPersonnel.email = `${auditPersonnel.email}_DELETED_${Date.now()}`;
      await this.auditPersonnelRepository.save(auditPersonnel);
      return { id: auditPersonnel.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }
  // Audit Document Type methods
  async findAllAuditDocumentTypes(filter: {
    [key: string]: string;
  }): Promise<AuditDocumentType[]> {
    const { search, page, limit } = filter;
    const query = this.auditDocumentTypeRepository
      .createQueryBuilder('auditDocumentType')
      .leftJoinAndSelect('auditDocumentType.createdBy', 'createdBy');
    if (search) {
      query.andWhere('auditDocumentType.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    return query.getMany();
  }

  async findOneAuditDocumentType(
    id: string,
  ): Promise<AuditDocumentType | null> {
    return this.auditDocumentTypeRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
  }

  async createAuditDocumentType(
    auditDocumentTypeData: CreateAuditDocumentTypeDto,
    user,
  ): Promise<AuditDocumentType> {
    // Check if audit document type name already exists for this client
    const name = auditDocumentTypeData.name;
    const existingAuditDocumentType = await this.auditDocumentTypeRepository
      .createQueryBuilder('auditDocumentType')
      .where('LOWER(auditDocumentType.name) = LOWER(:name)', { name: name })
      .getOne();

    if (existingAuditDocumentType) {
      throw new BadRequestException(auditHttpError('AUDIT_021'));
    }

    const auditDocumentType = this.auditDocumentTypeRepository.create({
      ...auditDocumentTypeData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: { id: user.id },
    });
    return this.auditDocumentTypeRepository.save(auditDocumentType);
  }

  async updateAuditDocumentType(
    id: string,
    auditDocumentTypeData: UpdateAuditDocumentTypeDto,
  ): Promise<AuditDocumentType> {
    const existingAuditDocumentType =
      await this.auditDocumentTypeRepository.findOne({
        where: { id },
      });

    if (!existingAuditDocumentType) {
      throw new NotFoundException(auditHttpError('AUDIT_022'));
    }
    const name = auditDocumentTypeData.name;
    const duplicateAuditDocumentType = await this.auditDocumentTypeRepository
      .createQueryBuilder('auditDocumentType')
      .where('LOWER(auditDocumentType.name) = LOWER(:name)', { name: name })
      .andWhere('auditDocumentType.id != :id', { id: id })
      .getOne();

    if (duplicateAuditDocumentType) {
      throw new BadRequestException(auditHttpError('AUDIT_021'));
    }
    existingAuditDocumentType.name =
      auditDocumentTypeData.name ?? existingAuditDocumentType.name;
    existingAuditDocumentType.description =
      auditDocumentTypeData.description ??
      existingAuditDocumentType.description;
    existingAuditDocumentType.updatedAt = Date.now();
    await this.auditDocumentTypeRepository.save(existingAuditDocumentType);
    const updated = await this.findOneAuditDocumentType(id);
    if (!updated) {
      throw new NotFoundException(auditHttpError('AUDIT_022'));
    }
    return updated;
  }

  async removeAuditDocumentType(id: string): Promise<void> {
    const existingAuditDocumentType =
      await this.auditDocumentTypeRepository.findOne({
        where: { id },
      });
    if (!existingAuditDocumentType) {
      throw new NotFoundException(auditHttpError('AUDIT_022'));
    }
    await this.auditDocumentTypeRepository.remove(existingAuditDocumentType);
  }

  // Audit Program methods
  private validateScheduleEntryMonth(month: number): void {
    if (
      !Number.isInteger(Number(month)) ||
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      throw new BadRequestException(auditHttpError('AUDIT_065'));
    }
  }

  private assertProgramPeriod(startDate?: number, duration?: number): void {
    const start = Number(startDate);
    const years = Number(duration);
    if (
      !Number.isFinite(start) ||
      start <= 0 ||
      !Number.isInteger(years) ||
      years < 1
    ) {
      throw new BadRequestException(auditHttpError('AUDIT_078'));
    }
  }

  private programMonthBounds(
    program: Pick<AuditProgram, 'startDate' | 'duration'>,
  ): { start: number; end: number } | undefined {
    const startMs = Number(program.startDate);
    const years = Number(program.duration);
    if (
      !Number.isFinite(startMs) ||
      startMs <= 0 ||
      !Number.isInteger(years) ||
      years < 1
    ) {
      return undefined;
    }
    const start = new Date(startMs);
    const end = new Date(startMs);
    end.setUTCFullYear(end.getUTCFullYear() + years);
    end.setUTCDate(end.getUTCDate() - 1);
    return {
      start: start.getUTCFullYear() * 12 + (start.getUTCMonth() + 1),
      end: end.getUTCFullYear() * 12 + (end.getUTCMonth() + 1),
    };
  }

  private assertScheduleSlot(
    year: number,
    month: number,
    program: Pick<AuditProgram, 'startDate' | 'duration'>,
  ): void {
    const bounds = this.programMonthBounds(program);
    const slot = year * 12 + month;
    if (
      !bounds ||
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      slot < bounds.start ||
      slot > bounds.end
    ) {
      throw new BadRequestException(auditHttpError('AUDIT_079'));
    }
  }

  private async validateScheduleEntryAuditInstance(
    auditProgramId: string,
    auditInstanceId: string | undefined,
  ): Promise<void> {
    if (!auditInstanceId) {
      return;
    }

    const auditInstance = await this.auditInstanceRepository.findOne({
      where: {
        id: auditInstanceId,
        auditProgramId,
        deleted: false,
      },
    });

    if (!auditInstance) {
      throw new BadRequestException(auditHttpError('AUDIT_068'));
    }
  }

  private async buildScheduleEntries(
    entries: any[] | undefined,
    auditProgram: AuditProgram,
  ): Promise<AuditProgramScheduleEntry[]> {
    if (!entries?.length) {
      return [];
    }

    const scheduleEntries: AuditProgramScheduleEntry[] = [];
    for (const entryDto of entries) {
      this.validateScheduleEntryMonth(Number(entryDto.month));
      this.assertScheduleSlot(
        Number(entryDto.year),
        Number(entryDto.month),
        auditProgram,
      );

      const process = String(entryDto.process ?? '').trim();
      if (!process) {
        throw new BadRequestException(auditHttpError('AUDIT_072'));
      }

      if (entryDto.isUnplanned && !entryDto.amendmentReason) {
        throw new BadRequestException(auditHttpError('AUDIT_066'));
      }

      await this.validateScheduleEntryAuditInstance(
        auditProgram.id,
        entryDto.auditInstanceId,
      );

      const scheduleEntry = new AuditProgramScheduleEntry();
      scheduleEntry.id = entryDto.id;
      scheduleEntry.auditProgram = auditProgram;
      scheduleEntry.year = Number(entryDto.year);
      scheduleEntry.month = Number(entryDto.month);
      scheduleEntry.process = process;
      scheduleEntry.notes = entryDto.notes;
      scheduleEntry.isUnplanned = !!entryDto.isUnplanned;
      scheduleEntry.amendmentReason = entryDto.amendmentReason;
      scheduleEntry.auditInstance = entryDto.auditInstanceId
        ? ({ id: entryDto.auditInstanceId } as AuditInstance)
        : undefined;
      scheduleEntry.auditInstanceId = entryDto.auditInstanceId;
      scheduleEntry.createdAt = entryDto.createdAt || Date.now();
      scheduleEntry.updatedAt = Date.now();
      scheduleEntry.deleted = false;
      scheduleEntries.push(scheduleEntry);
    }

    return scheduleEntries;
  }

  private getScheduleMonthFromTimestamp(
    timestamp?: number,
  ): number | undefined {
    if (!timestamp) return undefined;
    return new Date(Number(timestamp)).getUTCMonth() + 1;
  }

  private getScheduleYearFromTimestamp(timestamp?: number): number | undefined {
    if (!timestamp) return undefined;
    return new Date(Number(timestamp)).getUTCFullYear();
  }

  private instanceDatesMatchScheduleEntry(
    auditInstance: AuditInstance,
    scheduleEntry: AuditProgramScheduleEntry,
  ): boolean {
    const plannedMonth = Number(scheduleEntry.month);
    const plannedYear = Number(scheduleEntry.year);
    const startMonth = this.getScheduleMonthFromTimestamp(
      auditInstance.startDate,
    );
    const endMonth = this.getScheduleMonthFromTimestamp(auditInstance.endDate);
    const startYear = this.getScheduleYearFromTimestamp(
      auditInstance.startDate,
    );
    const endYear = this.getScheduleYearFromTimestamp(auditInstance.endDate);

    return (
      startMonth === plannedMonth &&
      endMonth === plannedMonth &&
      startYear === plannedYear &&
      endYear === plannedYear
    );
  }

  private async linkAuditInstanceToScheduleEntry(
    auditInstance: AuditInstance,
    scheduleEntryId: string | undefined,
    amendmentReason: string | undefined,
  ): Promise<void> {
    if (!scheduleEntryId) {
      return;
    }

    const auditProgramId =
      auditInstance.auditProgramId || auditInstance.auditProgram?.id;

    const scheduleEntry =
      await this.auditProgramScheduleEntryRepository.findOne({
        where: {
          id: scheduleEntryId,
          auditProgramId,
          deleted: false,
        },
      });

    if (!scheduleEntry) {
      throw new NotFoundException(auditHttpError('AUDIT_067'));
    }

    const linkedEntries = await this.auditProgramScheduleEntryRepository.find({
      where: {
        auditProgramId,
        auditInstanceId: auditInstance.id,
        deleted: false,
      },
    });

    const existingAmendment = linkedEntries.find((entry) => entry.isUnplanned);
    const entriesToSave: AuditProgramScheduleEntry[] = [];

    for (const entry of linkedEntries) {
      entry.auditInstanceId = undefined;
      entry.auditInstance = undefined;
      entry.updatedAt = Date.now();
      entriesToSave.push(entry);
    }

    if (this.instanceDatesMatchScheduleEntry(auditInstance, scheduleEntry)) {
      scheduleEntry.auditInstanceId = auditInstance.id;
      scheduleEntry.auditInstance = { id: auditInstance.id } as AuditInstance;
      scheduleEntry.updatedAt = Date.now();
      entriesToSave.push(scheduleEntry);
      await this.auditProgramScheduleEntryRepository.save(entriesToSave);
      return;
    }

    if (!amendmentReason?.trim()) {
      throw new BadRequestException(auditHttpError('AUDIT_066'));
    }

    const amendmentYear =
      this.getScheduleYearFromTimestamp(auditInstance.startDate) ||
      Number(scheduleEntry.year);
    const amendmentMonth =
      this.getScheduleMonthFromTimestamp(auditInstance.startDate) ||
      Number(scheduleEntry.month);
    const amendmentProgram = await this.auditProgramRepository.findOne({
      where: { id: auditProgramId },
    });
    if (amendmentProgram) {
      this.assertScheduleSlot(amendmentYear, amendmentMonth, amendmentProgram);
    }

    const amendmentEntry = existingAmendment || new AuditProgramScheduleEntry();
    amendmentEntry.auditProgramId = auditProgramId;
    amendmentEntry.auditProgram = { id: auditProgramId } as AuditProgram;
    amendmentEntry.year = amendmentYear;
    amendmentEntry.month = amendmentMonth;
    amendmentEntry.process = scheduleEntry.process;
    amendmentEntry.notes = scheduleEntry.notes;
    amendmentEntry.isUnplanned = true;
    amendmentEntry.amendmentReason = amendmentReason.trim();
    amendmentEntry.auditInstanceId = auditInstance.id;
    amendmentEntry.auditInstance = { id: auditInstance.id } as AuditInstance;
    amendmentEntry.createdAt = amendmentEntry.createdAt || Date.now();
    amendmentEntry.updatedAt = Date.now();
    amendmentEntry.deleted = false;
    entriesToSave.push(amendmentEntry);

    await this.auditProgramScheduleEntryRepository.save(entriesToSave);
  }

  private async linkAuditInstanceToUnplannedScheduleEntry(
    auditInstance: AuditInstance,
    process: string | undefined,
    amendmentReason: string | undefined,
  ): Promise<void> {
    const processName = process?.trim();
    if (!processName) {
      throw new BadRequestException(auditHttpError('AUDIT_072'));
    }

    if (!amendmentReason?.trim()) {
      throw new BadRequestException(auditHttpError('AUDIT_066'));
    }

    const auditProgramId =
      auditInstance.auditProgramId || auditInstance.auditProgram?.id;

    const auditProgram = await this.auditProgramRepository.findOne({
      where: { id: auditProgramId },
    });

    const linkedEntries = await this.auditProgramScheduleEntryRepository.find({
      where: {
        auditProgramId,
        auditInstanceId: auditInstance.id,
        deleted: false,
      },
    });

    const existingUnplannedEntry = linkedEntries.find(
      (entry) => entry.isUnplanned,
    );
    const entriesToSave: AuditProgramScheduleEntry[] = [];

    for (const entry of linkedEntries) {
      if (entry.id === existingUnplannedEntry?.id) {
        continue;
      }

      entry.auditInstanceId = undefined;
      entry.auditInstance = undefined;
      entry.updatedAt = Date.now();
      entriesToSave.push(entry);
    }

    const unplannedYear =
      this.getScheduleYearFromTimestamp(auditInstance.startDate) ||
      new Date().getUTCFullYear();
    const unplannedMonth =
      this.getScheduleMonthFromTimestamp(auditInstance.startDate) ||
      new Date().getUTCMonth() + 1;
    if (auditProgram) {
      this.assertScheduleSlot(unplannedYear, unplannedMonth, auditProgram);
    }

    const unplannedEntry =
      existingUnplannedEntry || new AuditProgramScheduleEntry();
    unplannedEntry.auditProgramId = auditProgramId;
    unplannedEntry.auditProgram = { id: auditProgramId } as AuditProgram;
    unplannedEntry.year = unplannedYear;
    unplannedEntry.month = unplannedMonth;
    unplannedEntry.process = processName;
    unplannedEntry.isUnplanned = true;
    unplannedEntry.amendmentReason = amendmentReason.trim();
    unplannedEntry.auditInstanceId = auditInstance.id;
    unplannedEntry.auditInstance = { id: auditInstance.id } as AuditInstance;
    unplannedEntry.createdAt = unplannedEntry.createdAt || Date.now();
    unplannedEntry.updatedAt = Date.now();
    unplannedEntry.deleted = false;
    entriesToSave.push(unplannedEntry);

    await this.auditProgramScheduleEntryRepository.save(entriesToSave);
  }

  async createAuditProgram(
    auditProgramDto: CreateAuditProgramDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const existingWithTitle = await this.auditProgramRepository
        .createQueryBuilder('auditProgram')
        .where('LOWER(auditProgram.title) = LOWER(:title)', {
          title: auditProgramDto.title,
        })
        .andWhere('auditProgram.deleted = false')
        .getOne();
      if (existingWithTitle) {
        throw new BadRequestException(auditHttpError('AUDIT_023'));
      }

      const auditProgram = new AuditProgram();
      auditProgram.title = auditProgramDto.title;
      auditProgram.scope = auditProgramDto.scope ?? '';
      auditProgram.objective = auditProgramDto.objective ?? '';
      auditProgram.auditActivityType = {
        id: auditProgramDto.auditActivityTypeId,
      } as AuditActivityType;
      auditProgram.startDate = Number(auditProgramDto.startDate);
      auditProgram.duration = Number(auditProgramDto.duration);
      this.assertProgramPeriod(auditProgram.startDate, auditProgram.duration);
      auditProgram.status = auditProgramDto.status;
      auditProgram.createdBy = { id: user.id } as any;
      auditProgram.createdAt = new Date().valueOf();
      auditProgram.updatedAt = new Date().valueOf();

      auditProgram.standards = (auditProgramDto.standardIds || []).map(
        (standardId) => {
          const programStandard = new AuditProgramStandard();
          programStandard.standard = { id: standardId } as Standard;
          programStandard.standardId = standardId;
          programStandard.auditProgram = auditProgram;
          return programStandard;
        },
      );

      const instanceStatus =
        auditProgramDto.status === AuditProgramStatus.DRAFT
          ? AuditInstanceStatus.DRAFT
          : AuditInstanceStatus.SCHEDULED;
      const instanceScheduleLinks: Array<{
        instance: AuditInstance;
        scheduleEntryId?: string;
        amendmentReason?: string;
      }> = [];

      if (auditProgramDto.instances && auditProgramDto.instances.length > 0) {
        const programCode = (auditProgramDto.title || '').trim();
        let increment = 1;

        auditProgram.auditInstances = auditProgramDto.instances.map(
          (instanceDto) => {
            const scheduledTimestamp = instanceDto.startDate ?? Date.now();
            const scheduledDate = new Date(scheduledTimestamp);
            const yyyy = scheduledDate.getUTCFullYear();
            const mm = String(scheduledDate.getUTCMonth() + 1).padStart(2, '0');

            const auditId = `${programCode}-${yyyy}-${mm}/${String(
              increment++,
            ).padStart(2, '0')}`;

            const auditInstance = new AuditInstance();
            auditInstance.auditProgram = auditProgram as any;
            auditInstance.startDate = instanceDto.startDate;
            auditInstance.endDate = instanceDto.endDate;
            auditInstance.status = instanceStatus;
            auditInstance.scope = instanceDto.scope ?? '';
            auditInstance.objective = instanceDto.objective ?? '';
            auditInstance.criteria = instanceDto.criteria?.trim() || undefined;
            auditInstance.scheduledByUserId = user.id;
            auditInstance.createdAt = Date.now();
            auditInstance.updatedAt = Date.now();
            auditInstance.auditId = auditId;

            instanceScheduleLinks.push({
              instance: auditInstance,
              scheduleEntryId: instanceDto.scheduleEntryId,
              amendmentReason: instanceDto.amendmentReason,
            });

            return auditInstance;
          },
        );
      }

      auditProgram.scheduleEntries = await this.buildScheduleEntries(
        auditProgramDto.scheduleEntries,
        auditProgram,
      );

      const savedAuditProgram =
        await this.auditProgramRepository.save(auditProgram);

      for (const link of instanceScheduleLinks) {
        link.instance.auditProgramId = savedAuditProgram.id;
        await this.linkAuditInstanceToScheduleEntry(
          link.instance,
          link.scheduleEntryId,
          link.amendmentReason,
        );
      }

      return { id: savedAuditProgram.id };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(
        auditHttpError('AUDIT_025', { cause: error }),
      );
    }
  }

  async findAllAuditPrograms(
    filterDto: any,
    user: UserRequest,
  ): Promise<AuditProgramDto[]> {
    try {
      const query = this.auditProgramRepository
        .createQueryBuilder('auditProgram')
        .leftJoinAndSelect(
          'auditProgram.auditActivityType',
          'auditActivityType',
        )
        .leftJoinAndSelect('auditProgram.standards', 'programStandards')
        .leftJoinAndSelect('programStandards.standard', 'standard')
        .leftJoinAndSelect(
          'auditProgram.scheduleEntries',
          'scheduleEntries',
          'scheduleEntries.deleted = false',
        )
        .leftJoinAndSelect(
          'scheduleEntries.auditInstance',
          'scheduleAuditInstance',
        )
        .andWhere('auditProgram.deleted = false');
      if (filterDto.status) {
        query.andWhere('auditProgram.status = :status', {
          status: filterDto.status,
        });
      } else if (
        filterDto.excludeDraft === 'true' ||
        filterDto.excludeDraft === true
      ) {
        // Exclude DRAFT status programs when excludeDraft is true
        query.andWhere('auditProgram.status != :draftStatus', {
          draftStatus: AuditProgramStatus.DRAFT,
        });
      }

      if (filterDto.auditActivityTypeId) {
        query.andWhere(
          'auditProgram.auditActivityTypeId = :auditActivityTypeId',
          {
            auditActivityTypeId: filterDto.auditActivityTypeId,
          },
        );
      }

      if (filterDto.search) {
        query.andWhere('LOWER(auditProgram.title) LIKE :search', {
          search: `%${filterDto.search}%`,
        });
      }

      const auditPrograms = await query.getMany();

      return auditPrograms.map((auditProgram) =>
        this.formatAuditProgram(auditProgram),
      );
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  private formatAuditProgram(auditProgram: AuditProgram): AuditProgramDto {
    return {
      id: auditProgram.id,
      title: auditProgram.title,
      scope: auditProgram.scope || '',
      objective: auditProgram.objective || '',
      startDate:
        auditProgram.startDate != null
          ? Number(auditProgram.startDate)
          : undefined,
      status: auditProgram.status,
      duration: auditProgram.duration,
      standards:
        auditProgram.standards?.map((programStandard) => ({
          id: programStandard.standard.id,
          name: programStandard.standard.name,
        })) || [],
      auditActivityType: auditProgram.auditActivityType
        ? ({
            id: auditProgram.auditActivityType.id,
            name: auditProgram.auditActivityType.name,
          } as AuditActivityType)
        : undefined,
      auditInstances:
        auditProgram.auditInstances?.map((instance) => ({
          id: instance.id,
          startDate: Number(instance.startDate),
          endDate: Number(instance.endDate),
          scope: instance.scope,
          objective: instance.objective,
          criteria: instance.criteria || undefined,
        })) || [],
      scheduleEntries:
        auditProgram.scheduleEntries?.map((entry) => ({
          id: entry.id,
          year: Number(entry.year),
          month: Number(entry.month),
          process: entry.process,
          notes: entry.notes,
          isUnplanned: entry.isUnplanned,
          amendmentReason: entry.amendmentReason,
          auditInstanceId: entry.auditInstanceId,
          auditInstance: entry.auditInstance
            ? {
                id: entry.auditInstance.id,
                auditId: entry.auditInstance.auditId,
                startDate: entry.auditInstance.startDate
                  ? Number(entry.auditInstance.startDate)
                  : undefined,
                endDate: entry.auditInstance.endDate
                  ? Number(entry.auditInstance.endDate)
                  : undefined,
                status: entry.auditInstance.status,
              }
            : undefined,
        })) || [],
    };
  }

  async findOneAuditProgram(
    id: string,
    user: UserRequest,
  ): Promise<AuditProgramDto> {
    try {
      const query = this.auditProgramRepository
        .createQueryBuilder('auditProgram')
        .leftJoinAndSelect(
          'auditProgram.auditActivityType',
          'auditActivityType',
        )
        .leftJoinAndSelect('auditProgram.standards', 'programStandards')
        .leftJoinAndSelect('programStandards.standard', 'standard')
        .leftJoinAndSelect(
          'auditProgram.auditInstances',
          'auditInstances',
          'auditInstances.deleted = false',
        )
        .leftJoinAndSelect(
          'auditProgram.scheduleEntries',
          'scheduleEntries',
          'scheduleEntries.deleted = false',
        )
        .leftJoinAndSelect(
          'scheduleEntries.auditInstance',
          'scheduleAuditInstance',
        )
        .andWhere('auditProgram.id = :id', { id: id })
        .andWhere('auditProgram.deleted = false');
      const auditProgram = await query.getOne();
      if (!auditProgram) {
        throw new NotFoundException(auditHttpError('AUDIT_026'));
      }
      return this.formatAuditProgram(auditProgram);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async updateAuditProgram(
    id: string,
    auditProgramDto: UpdateAuditProgramDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const auditProgram = await this.auditProgramRepository.findOne({
        where: { id },
        relations: [
          'auditActivityType',
          'standards',
          'standards.standard',
          'scheduleEntries',
          'scheduleEntries.auditInstance',
          'auditInstances',
        ],
      });
      if (!auditProgram) {
        throw new NotFoundException(auditHttpError('AUDIT_026'));
      }

      if (typeof auditProgramDto.title !== 'undefined') {
        const dup = await this.auditProgramRepository
          .createQueryBuilder('auditProgram')
          .where('LOWER(auditProgram.title) = LOWER(:title)', {
            title: auditProgramDto.title,
          })
          .andWhere('auditProgram.id != :id', { id })
          .andWhere('auditProgram.deleted = false')
          .getOne();
        if (dup) {
          throw new BadRequestException(auditHttpError('AUDIT_023'));
        }
      }

      if (typeof auditProgramDto.title !== 'undefined')
        auditProgram.title = auditProgramDto.title;

      if (auditProgramDto.scope !== undefined)
        auditProgram.scope = auditProgramDto.scope;
      if (auditProgramDto.objective !== undefined)
        auditProgram.objective = auditProgramDto.objective;
      if (auditProgramDto.startDate !== undefined)
        auditProgram.startDate = Number(auditProgramDto.startDate);
      if (auditProgramDto.duration !== undefined)
        auditProgram.duration = Number(auditProgramDto.duration);
      if (
        auditProgramDto.startDate !== undefined ||
        auditProgramDto.duration !== undefined
      ) {
        this.assertProgramPeriod(auditProgram.startDate, auditProgram.duration);
      }
      if (auditProgramDto.standardIds !== undefined) {
        await this.auditProgramRepository.manager.delete(AuditProgramStandard, {
          auditProgram: { id } as any,
        } as any);

        auditProgram.standards = auditProgramDto.standardIds.map(
          (standardId) => {
            const programStandard = new AuditProgramStandard();
            programStandard.standard = { id: standardId } as Standard;
            programStandard.standardId = standardId;
            programStandard.auditProgram = auditProgram as any;
            return programStandard;
          },
        );
      }

      // Handle status change and update instances accordingly
      const oldStatus = auditProgram.status;
      if (typeof auditProgramDto.status !== 'undefined') {
        auditProgram.status = auditProgramDto.status as any;

        // 4. When changing from DRAFT to PLANNED, update DRAFT instances to SCHEDULED
        if (
          oldStatus === AuditProgramStatus.DRAFT &&
          auditProgramDto.status === AuditProgramStatus.PLANNED
        ) {
          const draftInstances = (auditProgram.auditInstances || []).filter(
            (instance) =>
              !instance.deleted &&
              instance.status === AuditInstanceStatus.DRAFT,
          );

          for (const instance of draftInstances) {
            instance.status = AuditInstanceStatus.SCHEDULED;
            instance.updatedAt = Date.now();
          }
        }

        // 5. When changing from PLANNED to DRAFT, do NOT allow if it has any instances (regardless of status)
        if (
          oldStatus === AuditProgramStatus.PLANNED &&
          auditProgramDto.status === AuditProgramStatus.DRAFT
        ) {
          const instances = (auditProgram.auditInstances || []).filter(
            (instance) => !instance.deleted,
          );

          if (instances.length > 0) {
            throw new BadRequestException(auditHttpError('AUDIT_027'));
          }
        }
      }

      if (typeof auditProgramDto.auditActivityTypeId !== 'undefined') {
        // Check if activity type is being changed
        const oldActivityTypeId = auditProgram.auditActivityType?.id;
        const newActivityTypeId = auditProgramDto.auditActivityTypeId;

        if (oldActivityTypeId && oldActivityTypeId !== newActivityTypeId) {
          // Check if there are audit instances for this audit program
          const auditInstancesCount = await this.auditInstanceRepository.count({
            where: {
              auditProgram: { id: id },
              deleted: false,
            },
          });

          if (auditInstancesCount > 0) {
            throw new BadRequestException(auditHttpError('AUDIT_028'));
          }
        }

        auditProgram.auditActivityType = {
          id: auditProgramDto.auditActivityTypeId,
        } as AuditActivityType;
      }

      // Handle audit instances using OneToMany cascade
      const instanceScheduleLinks: Array<{
        instance: AuditInstance;
        scheduleEntryId?: string;
        amendmentReason?: string;
      }> = [];

      // if (auditProgramDto.instances && auditProgramDto.instances.length > 0) {
      //   const instanceStatus =
      //     auditProgram.status === AuditProgramStatus.DRAFT
      //       ? AuditInstanceStatus.DRAFT
      //       : AuditInstanceStatus.SCHEDULED;

      //   const existingInstancesById = new Map<string, AuditInstance>(
      //     (auditProgram.auditInstances || []).map((instance) => [
      //       instance.id,
      //       instance,
      //     ]),
      //   );

      //   for (const instanceDto of auditProgramDto.instances) {
      //     if (instanceDto.id) {
      //       // Update existing instance through the relation
      //       const existingInstance = existingInstancesById.get(instanceDto.id);
      //       if (!existingInstance) {
      //         throw new NotFoundException(auditHttpError("AUDIT_030"));
      //       }

      //       if (typeof instanceDto.startDate !== "undefined") {
      //         existingInstance.startDate = instanceDto.startDate;
      //       }
      //       if (typeof instanceDto.endDate !== "undefined") {
      //         existingInstance.endDate = instanceDto.endDate;
      //       }
      //       if (typeof instanceDto.scope !== "undefined") {
      //         existingInstance.scope = instanceDto.scope;
      //       }
      //       if (typeof instanceDto.objective !== "undefined") {
      //         existingInstance.objective = instanceDto.objective;
      //       }
      //       if (typeof instanceDto.criteria !== "undefined") {
      //         existingInstance.criteria = instanceDto.criteria?.trim() || undefined;
      //       }
      //       existingInstance.updatedAt = Date.now();
      //       instanceScheduleLinks.push({
      //         instance: existingInstance,
      //         scheduleEntryId: instanceDto.scheduleEntryId,
      //         amendmentReason: instanceDto.amendmentReason,
      //       });
      //     } else {
      //       // Create new instance attached to this program

      //       const programCode = (auditProgram.title || "").trim();

      //       const computedAuditId = await this.computeAuditId(
      //         programCode,
      //         new Date(Number(auditProgram.startDate)).getUTCFullYear(),
      //         auditProgram.id,
      //         this.auditInstanceRepository.manager,
      //       );

      //       const newInstance = new AuditInstance();
      //       newInstance.auditProgram = auditProgram as any;
      //       newInstance.startDate = instanceDto.startDate;
      //       newInstance.endDate = instanceDto.endDate;
      //       newInstance.status = instanceStatus;
      //       newInstance.scope = instanceDto.scope;
      //       newInstance.objective = instanceDto.objective;
      //       newInstance.criteria = instanceDto.criteria?.trim() || undefined;
      //       newInstance.scheduledByUserId = user.id;
      //       newInstance.createdAt = Date.now();
      //       newInstance.updatedAt = Date.now();
      //       newInstance.auditId = computedAuditId;

      //       if (!auditProgram.auditInstances) {
      //         auditProgram.auditInstances = [];
      //       }
      //       auditProgram.auditInstances.push(newInstance);
      //       instanceScheduleLinks.push({
      //         instance: newInstance,
      //         scheduleEntryId: instanceDto.scheduleEntryId,
      //         amendmentReason: instanceDto.amendmentReason,
      //       });
      //     }
      //   }
      // }

      if (auditProgramDto.scheduleEntries) {
        await this.auditProgramRepository.manager.delete(
          AuditProgramScheduleEntry,
          { auditProgram: { id } as any } as any,
        );

        auditProgram.scheduleEntries = await this.buildScheduleEntries(
          auditProgramDto.scheduleEntries,
          auditProgram,
        );
      } else if (
        auditProgramDto.startDate !== undefined ||
        auditProgramDto.duration !== undefined
      ) {
        for (const entry of auditProgram.scheduleEntries || []) {
          if (entry.deleted) continue;
          this.assertScheduleSlot(
            Number(entry.year),
            Number(entry.month),
            auditProgram,
          );
        }
      }

      auditProgram.updatedAt = Date.now();
      await this.auditProgramRepository.save(auditProgram);

      for (const link of instanceScheduleLinks) {
        link.instance.auditProgramId = auditProgram.id;
        await this.linkAuditInstanceToScheduleEntry(
          link.instance,
          link.scheduleEntryId,
          link.amendmentReason,
        );
      }

      return { id: auditProgram.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(error);
    }
  }

  async createAuditProgramScheduleEntry(
    auditProgramId: string,
    scheduleEntryDto: CreateAuditProgramScheduleEntryDto,
    user: UserRequest,
  ): Promise<AuditProgramDto> {
    const auditProgram = await this.auditProgramRepository.findOne({
      where: { id: auditProgramId, deleted: false },
    });

    if (!auditProgram) {
      throw new NotFoundException(auditHttpError('AUDIT_026'));
    }

    if (!scheduleEntryDto.amendmentReason) {
      throw new BadRequestException(auditHttpError('AUDIT_066'));
    }

    const [scheduleEntry] = await this.buildScheduleEntries(
      [{ ...scheduleEntryDto, isUnplanned: true }],
      auditProgram,
    );

    await this.auditProgramScheduleEntryRepository.save(scheduleEntry);
    return this.findOneAuditProgram(auditProgramId, user);
  }

  async updateAuditProgramScheduleEntry(
    auditProgramId: string,
    scheduleEntryId: string,
    scheduleEntryDto: CreateAuditProgramScheduleEntryDto,
    user: UserRequest,
  ): Promise<AuditProgramDto> {
    const auditProgram = await this.auditProgramRepository.findOne({
      where: { id: auditProgramId, deleted: false },
    });

    if (!auditProgram) {
      throw new NotFoundException(auditHttpError('AUDIT_026'));
    }

    const existingScheduleEntry =
      await this.auditProgramScheduleEntryRepository.findOne({
        where: {
          id: scheduleEntryId,
          auditProgramId,
          deleted: false,
        },
      });

    if (!existingScheduleEntry) {
      throw new NotFoundException(auditHttpError('AUDIT_067'));
    }

    const [scheduleEntry] = await this.buildScheduleEntries(
      [
        {
          ...existingScheduleEntry,
          ...scheduleEntryDto,
          id: scheduleEntryId,
          isUnplanned: existingScheduleEntry.isUnplanned,
          amendmentReason:
            scheduleEntryDto.amendmentReason ??
            existingScheduleEntry.amendmentReason,
          createdAt: existingScheduleEntry.createdAt,
        },
      ],
      auditProgram,
    );

    await this.auditProgramScheduleEntryRepository.save(scheduleEntry);
    return this.findOneAuditProgram(auditProgramId, user);
  }

  async deleteAuditProgramScheduleEntry(
    auditProgramId: string,
    scheduleEntryId: string,
    user: UserRequest,
  ): Promise<AuditProgramDto> {
    const scheduleEntry =
      await this.auditProgramScheduleEntryRepository.findOne({
        where: {
          id: scheduleEntryId,
          auditProgramId,
          deleted: false,
        },
      });

    if (!scheduleEntry) {
      throw new NotFoundException(auditHttpError('AUDIT_067'));
    }

    scheduleEntry.deleted = true;
    scheduleEntry.updatedAt = Date.now();
    await this.auditProgramScheduleEntryRepository.save(scheduleEntry);

    return this.findOneAuditProgram(auditProgramId, user);
  }

  async deleteAuditProgram(
    id: string,
    user: UserRequest,
  ): Promise<{ id: string }> {
    try {
      const auditProgram = await this.auditProgramRepository.findOne({
        where: { id: id, deleted: false },
      });
      if (!auditProgram) {
        throw new NotFoundException(auditHttpError('AUDIT_026'));
      }
      const auditInstances = await this.auditInstanceRepository.count({
        where: { auditProgram: { id: id }, deleted: false },
      });
      if (auditInstances > 0) {
        throw new BadRequestException(auditHttpError('AUDIT_031'));
      }
      auditProgram.title = `${auditProgram.title}_DELETED_${Date.now()}`;
      auditProgram.deleted = true;
      await this.auditProgramRepository.save(auditProgram);
      return { id: auditProgram.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }
  // ChecklistDefinition CRUD methods
  async findAllChecklistDefinitions(
    user: UserRequest,
    filter: { [key: string]: string },
  ): Promise<ChecklistDefinitionResponseDto[]> {
    const { search, auditProgramId } = filter;

    const query = this.checklistDefinitionRepository
      .createQueryBuilder('checklistDefinition')
      .leftJoinAndSelect('checklistDefinition.createdBy', 'createdBy')
      .leftJoinAndSelect('checklistDefinition.activityType', 'activityType')
      .leftJoin('checklistDefinition.teams', 'checklistTeams')
      .leftJoin('checklistTeams.team', 'team')
      .where('checklistDefinition.deleted = false');

    query.andWhere('team.id IN (:...teamIds)', {
      teamIds: this.accessibleTeamIds(user),
    });

    if (search) {
      query.andWhere('checklistDefinition.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (auditProgramId) {
      const auditProgram = await this.auditProgramRepository.findOne({
        where: {
          id: auditProgramId,
          deleted: false,
        },
      });

      if (auditProgram) {
        // Filter out draft checklist definitions when filtering by audit program
        query.andWhere(
          '(checklistDefinition.isDraft = false or (checklistDefinition.isDraft = true and version <> 1))',
        );

        if (auditProgram.auditActivityTypeId) {
          query.andWhere(
            'checklistDefinition.activityTypeId = :activityTypeId',
            {
              activityTypeId: auditProgram.auditActivityTypeId,
            },
          );
        }
      }
    }

    const checklistDefinitions = await query.getMany();

    return checklistDefinitions.map((cd) => ({
      id: cd.id,
      title: cd.title,
      description: cd.description,
      version: cd.version,
      isDraft: cd.isDraft,
      activityType: cd.activityType
        ? {
            id: cd.activityType.id,
            name: cd.activityType.name,
          }
        : undefined,
      createdBy: {
        id: cd.createdBy.id,
        fname: cd.createdBy.fname,
        lname: cd.createdBy.lname,
      },
      createdAt: cd.createdAt,
      updatedAt: cd.updatedAt,
    }));
  }

  async findOneChecklistDefinition(
    id: string,
    version?: string,
  ): Promise<ChecklistDefinitionResponseDto> {
    const queryBuilder = this.checklistDefinitionRepository
      .createQueryBuilder('checklistDefinition')
      .leftJoinAndSelect('checklistDefinition.createdBy', 'createdBy')
      .leftJoinAndSelect('checklistDefinition.activityType', 'activityType')
      .leftJoinAndSelect('checklistDefinition.teams', 'checklistTeams')
      .leftJoinAndSelect('checklistTeams.team', 'team')
      .leftJoinAndSelect('checklistDefinition.versions', 'versions')
      .leftJoinAndSelect('versions.sections', 'sections')
      .leftJoinAndSelect('sections.questions', 'questions')
      .leftJoinAndSelect('sections.subsections', 'subsections')
      .leftJoinAndSelect('subsections.questions', 'subsectionQuestions')
      .leftJoinAndSelect('sections.createdBy', 'sectionCreatedBy')
      .leftJoinAndSelect('subsections.createdBy', 'subsectionCreatedBy')
      .leftJoinAndSelect('questions.createdBy', 'questionCreatedBy')
      .leftJoinAndSelect(
        'subsectionQuestions.createdBy',
        'subsectionQuestionCreatedBy',
      )
      .where('checklistDefinition.id = :id', { id })
      .andWhere('checklistDefinition.deleted = false');

    if (version) {
      // Get specific version
      queryBuilder.andWhere('versions.version = :version', { version });
    } else {
      // Get latest version (highest version number/string)
      queryBuilder.andWhere(
        'versions.created_at = (SELECT MAX(v.created_at) FROM checklist_definition_versions v WHERE v.checklist_definition_id = checklistDefinition.id)',
      );
    }

    queryBuilder.orderBy('sections.orderIndex', 'ASC');
    queryBuilder.addOrderBy('subsections.orderIndex', 'ASC');
    queryBuilder.addOrderBy('questions.orderIndex', 'ASC');
    queryBuilder.addOrderBy('subsectionQuestions.orderIndex', 'ASC');

    const checklistDefinition = await queryBuilder.getOne();

    if (!checklistDefinition) {
      throw new NotFoundException(auditHttpError('AUDIT_032'));
    }

    // Get the active version from the loaded versions
    const activeVersion = checklistDefinition.versions?.[0];
    if (!activeVersion) {
      throw new NotFoundException(auditHttpError('AUDIT_033'));
    }

    return {
      id: checklistDefinition.id,
      title: checklistDefinition.title,
      description: checklistDefinition.description,
      version: checklistDefinition.version,
      isDraft: checklistDefinition.isDraft,
      activityType: checklistDefinition.activityType
        ? {
            id: checklistDefinition.activityType.id,
            name: checklistDefinition.activityType.name,
          }
        : undefined,
      teams: checklistDefinition.teams.map((link) => ({
        id: link.team.id,
        name: link.team.name,
      })),
      createdBy: {
        id: checklistDefinition.createdBy.id,
        fname: checklistDefinition.createdBy.fname,
        lname: checklistDefinition.createdBy.lname,
      },
      createdAt: checklistDefinition.createdAt,
      updatedAt: checklistDefinition.updatedAt,
      sections: activeVersion.sections
        .filter((s) => !s.parentSectionId)
        .map((section) => this.formatChecklistSectionDefinition(section)),
    };
  }

  private formatChecklistSectionDefinition(
    section: ChecklistSectionDefinition,
  ): ChecklistSectionDefinitionResponseDto {
    return {
      id: section.id,
      title: section.title,
      description: section.description,
      orderIndex: section.orderIndex,
      questions: (section.questions || []).map((q) =>
        this.formatChecklistQuestionDefinition(q),
      ),
      subsections: (section.subsections || []).map((sub) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        orderIndex: sub.orderIndex,
        questions: (sub.questions || []).map((q) =>
          this.formatChecklistQuestionDefinition(q),
        ),
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        createdBy: sub.createdBy
          ? {
              id: sub.createdBy.id,
              fname: sub.createdBy.fname,
              lname: sub.createdBy.lname,
            }
          : undefined,
      })),
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      createdBy: section.createdBy
        ? {
            id: section.createdBy.id,
            fname: section.createdBy.fname,
            lname: section.createdBy.lname,
          }
        : undefined,
    };
  }

  private formatChecklistQuestionDefinition(
    question: ChecklistQuestionDefinition,
  ): ChecklistQuestionDefinitionResponseDto {
    return {
      id: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      reference: question.reference,
      guidanceNotes: question.guidanceNotes,
      orderIndex: question.orderIndex,
      createdBy: question.createdBy
        ? {
            id: question.createdBy.id,
            fname: question.createdBy.fname,
            lname: question.createdBy.lname,
          }
        : undefined,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  async createChecklistDefinition(
    checklistDefinitionData: CreateChecklistDefinitionDto,
    user,
  ): Promise<{ id: string }> {
    // Check if checklist definition title already exists within the same teams
    const title = checklistDefinitionData.title;
    const teamIds = checklistDefinitionData.teamIds || [];

    if (teamIds.length > 0) {
      const existingChecklistDefinition =
        await this.checklistDefinitionRepository
          .createQueryBuilder('checklistDefinition')
          .leftJoin('checklistDefinition.teams', 'checklistTeams')
          .leftJoin('checklistTeams.team', 'team')
          .where('LOWER(checklistDefinition.title) = LOWER(:title)', {
            title: title,
          })
          .andWhere('checklistDefinition.deleted = false')
          .andWhere('team.id IN (:...teamIds)', {
            teamIds,
          })
          .getOne();

      if (existingChecklistDefinition) {
        throw new BadRequestException(auditHttpError('AUDIT_034'));
      }
    }

    const checklistDefinition = this.checklistDefinitionRepository.create({
      ...checklistDefinitionData,
      version: '1.0',
      createdBy: { id: user.id },
      activityTypeId: checklistDefinitionData.activityTypeId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      teams: (checklistDefinitionData.teamIds ?? []).map(
        (teamId) =>
          ({
            team: { id: teamId } as Team,
          }) as any,
      ),
      // A newly created checklist should always start in draft state
      isDraft: true,
    });
    const checklistDefinitionVersion =
      this.checklistDefinitionVersionRepository.create({
        checklistDefinitionId: checklistDefinition.id,
        version: '1.0',
        status: ChecklistVersionStatus.DRAFT,
        createdBy: { id: user.id },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sections: (checklistDefinitionData.sections || []).flatMap(
          (section) => {
            const topLevel = {
              title: section.title,
              orderIndex: section.orderIndex,
              createdBy: { id: user.id },
              createdAt: Date.now(),
              updatedAt: Date.now(),
              questions: (section.questions || []).map((question) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                reference: question.reference,
                guidanceNotes: question.guidanceNotes,
                orderIndex: question.orderIndex,
                createdBy: { id: user.id },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })),
            } as any;
            const subs = (section.subsections || []).map((sub) => ({
              title: sub.title,
              orderIndex: sub.orderIndex,
              createdBy: { id: user.id },
              createdAt: Date.now(),
              updatedAt: Date.now(),
              parentSection: topLevel as any,
              questions: (sub.questions || []).map((question) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                reference: question.reference,
                guidanceNotes: question.guidanceNotes,
                orderIndex: question.orderIndex,
                createdBy: { id: user.id },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })),
            }));
            return [topLevel, ...subs];
          },
        ),
      });
    checklistDefinition.versions = [checklistDefinitionVersion];

    const savedChecklistDefinition =
      await this.checklistDefinitionRepository.save(checklistDefinition);
    return { id: savedChecklistDefinition.id };
  }

  async updateChecklistDefinition(
    id: string,
    checklistDefinitionData: UpdateChecklistDefinitionDto,
    user: any,
  ): Promise<{ id: string; version: string }> {
    const existingChecklistDefinition =
      await this.checklistDefinitionRepository.findOne({
        where: { id },
        relations: ['versions', 'teams', 'teams.team'],
      });

    if (!existingChecklistDefinition) {
      throw new NotFoundException({
        message: 'Checklist definition not found',
        key: 'AUDIT_032',
      });
    }

    // Check for duplicate title if title or teams are being updated
    if (checklistDefinitionData.title || checklistDefinitionData.teamIds) {
      const teamIds =
        checklistDefinitionData.teamIds &&
        checklistDefinitionData.teamIds.length > 0
          ? checklistDefinitionData.teamIds
          : (existingChecklistDefinition.teams || []).map(
              (link) => link.team.id,
            );

      const titleToCheck =
        checklistDefinitionData.title || existingChecklistDefinition.title;

      if (teamIds.length > 0) {
        const duplicateChecklistDefinition =
          await this.checklistDefinitionRepository
            .createQueryBuilder('checklistDefinition')
            .leftJoin('checklistDefinition.teams', 'checklistTeams')
            .leftJoin('checklistTeams.team', 'team')
            .where('LOWER(checklistDefinition.title) = LOWER(:title)', {
              title: titleToCheck,
            })
            .andWhere('checklistDefinition.deleted = false')
            .andWhere('checklistDefinition.id != :id', {
              id: id,
            })
            .andWhere('team.id IN (:...teamIds)', {
              teamIds,
            })
            .getOne();

        if (duplicateChecklistDefinition) {
          throw new BadRequestException(auditHttpError('AUDIT_034'));
        }
      }
    }

    // Update checklist definition basic fields
    if (checklistDefinitionData.title) {
      existingChecklistDefinition.title = checklistDefinitionData.title;
    }
    if (checklistDefinitionData.description !== undefined) {
      existingChecklistDefinition.description =
        checklistDefinitionData.description;
    }
    if (checklistDefinitionData.activityTypeId) {
      existingChecklistDefinition.activityTypeId =
        checklistDefinitionData.activityTypeId;
    }

    existingChecklistDefinition.updatedAt = Date.now();

    if (checklistDefinitionData.teamIds) {
      await this.checklistDefinitionTeamRepository.delete({
        checklistDefinition: { id } as any,
      });
      existingChecklistDefinition.teams = checklistDefinitionData.teamIds.map(
        (teamId) =>
          ({
            team: { id: teamId } as Team,
          }) as any,
      );
    }

    // Determine if there is an existing DRAFT version
    let draftVersion = await this.checklistDefinitionVersionRepository.findOne({
      where: {
        checklistDefinitionId: existingChecklistDefinition.id,
        status: ChecklistVersionStatus.DRAFT as any,
      },
      relations: [
        'sections',
        'sections.questions',
        'sections.subsections',
        'sections.subsections.questions',
      ],
      order: { createdAt: 'DESC' },
    });

    // If no draft exists, create a new draft version by incrementing
    if (!draftVersion) {
      const currentVersion = existingChecklistDefinition.version;
      const newVersion = `${+currentVersion + 1}`;
      draftVersion = this.checklistDefinitionVersionRepository.create({
        checklistDefinitionId: existingChecklistDefinition.id,
        version: newVersion,
        status: ChecklistVersionStatus.DRAFT,
        createdBy: { id: user.id },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      // Attach to definition
      if (!existingChecklistDefinition.versions) {
        existingChecklistDefinition.versions = [];
      }
      existingChecklistDefinition.versions.push(draftVersion);
      // Mark definition as draft and bump its version pointer
      existingChecklistDefinition.version = newVersion;
      existingChecklistDefinition.isDraft = true as any;

      // If sections are not provided with the update (e.g., only title/description changed),
      // initialize the draft by cloning sections/questions from the latest existing version
      if (
        !checklistDefinitionData.sections ||
        checklistDefinitionData.sections.length === 0
      ) {
        const latestExistingVersion =
          await this.checklistDefinitionVersionRepository.findOne({
            where: {
              checklistDefinitionId: existingChecklistDefinition.id,
            },
            relations: [
              'sections',
              'sections.questions',
              'sections.subsections',
              'sections.subsections.questions',
            ],
            order: { createdAt: 'DESC' },
          });
        if (latestExistingVersion && latestExistingVersion.sections) {
          draftVersion.sections = latestExistingVersion.sections.flatMap(
            (section) => {
              const topLevel = {
                title: section.title,
                orderIndex: section.orderIndex,
                createdBy: { id: user.id },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                questions: (section.questions || []).map((question) => ({
                  questionText: question.questionText,
                  questionType: question.questionType,
                  reference: question.reference,
                  guidanceNotes: question.guidanceNotes,
                  orderIndex: question.orderIndex,
                  createdBy: { id: user.id },
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                })),
              } as any;
              const subs = (section.subsections || []).map((sub) => ({
                title: sub.title,
                orderIndex: sub.orderIndex,
                createdBy: { id: user.id },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                parentSection: topLevel as any,
                questions: (sub.questions || []).map((question) => ({
                  questionText: question.questionText,
                  questionType: question.questionType,
                  reference: question.reference,
                  guidanceNotes: question.guidanceNotes,
                  orderIndex: question.orderIndex,
                  createdBy: { id: user.id },
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                })),
              }));
              return [topLevel, ...subs];
            },
          ) as any;
        }
      }
    }

    // If sections provided, replace sections in the draft version
    if (
      checklistDefinitionData.sections &&
      checklistDefinitionData.sections.length > 0
    ) {
      // Delete existing sections for this draft version to avoid duplicates
      if (draftVersion.id) {
        const existingSections =
          await this.checklistSectionDefinitionRepository.find({
            where: {
              checklistDefinitionVersionId: draftVersion.id,
            },
          });
        if (existingSections.length > 0) {
          const sectionIds = existingSections.map((s) => s.id);
          // Delete questions first to satisfy FK constraints
          await this.checklistQuestionDefinitionRepository.delete({
            sectionDefinitionId: In(sectionIds),
          } as any);
          // Delete child sections next
          const childSectionIds = existingSections
            .filter((s: any) => !!s.parentSectionId)
            .map((s) => s.id);
          if (childSectionIds.length > 0) {
            await this.checklistSectionDefinitionRepository.delete({
              id: In(childSectionIds),
            } as any);
          }
          // Then delete sections
          await this.checklistSectionDefinitionRepository.delete({
            id: In(sectionIds),
          } as any);
        }
      }

      draftVersion.sections = (checklistDefinitionData.sections || []).flatMap(
        (section) => {
          const topLevel = {
            title: section.title,
            orderIndex: section.orderIndex,
            createdBy: { id: user.id },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            questions: (section.questions || []).map((question) => ({
              questionText: question.questionText,
              questionType: question.questionType,
              reference: question.reference,
              guidanceNotes: question.guidanceNotes,
              orderIndex: question.orderIndex,
              createdBy: { id: user.id },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })),
          } as any;
          const subs = (section.subsections || []).map((sub) => ({
            title: sub.title,
            orderIndex: sub.orderIndex,
            createdBy: { id: user.id },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            parentSection: topLevel as any,
            questions: (sub.questions || []).map((question) => ({
              questionText: question.questionText,
              questionType: question.questionType,
              reference: question.reference,
              guidanceNotes: question.guidanceNotes,
              orderIndex: question.orderIndex,
              createdBy: { id: user.id },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })),
          }));
          return [topLevel, ...subs];
        },
      ) as any;
      draftVersion.updatedAt = Date.now();
    }

    await this.checklistDefinitionRepository.save(existingChecklistDefinition);
    // Persist draftVersion changes if any
    if (draftVersion) {
      await this.checklistDefinitionVersionRepository.save(draftVersion);
    }

    return {
      id: existingChecklistDefinition.id,
      version: existingChecklistDefinition.version,
    };
  }

  async publishChecklistDefinition(
    id: string,
    user: any,
  ): Promise<{ id: string; version: string }> {
    const existingChecklistDefinition =
      await this.checklistDefinitionRepository.findOne({
        where: { id },
      });
    if (!existingChecklistDefinition) {
      throw new NotFoundException({
        message: 'Checklist definition not found',
        key: 'AUDIT_032',
      });
    }
    // Find the latest draft version
    const draftVersion =
      await this.checklistDefinitionVersionRepository.findOne({
        where: {
          checklistDefinitionId: id,
          status: ChecklistVersionStatus.DRAFT as any,
        },
        order: { createdAt: 'DESC' },
      });
    if (!draftVersion) {
      // Nothing to publish
      return {
        id: existingChecklistDefinition.id,
        version: existingChecklistDefinition.version,
      };
    }
    draftVersion.status = ChecklistVersionStatus.PUBLISHED as any;
    draftVersion.updatedAt = Date.now();
    existingChecklistDefinition.isDraft = false as any;
    existingChecklistDefinition.updatedAt = Date.now();
    // Ensure the definition.version matches the published draft
    existingChecklistDefinition.version = draftVersion.version;
    await this.checklistDefinitionVersionRepository.save(draftVersion);
    await this.checklistDefinitionRepository.save(existingChecklistDefinition);
    return {
      id: existingChecklistDefinition.id,
      version: existingChecklistDefinition.version,
    };
  }

  //
  async removeChecklistDefinition(
    checklistDefinitionId: string,
  ): Promise<void> {
    const existingChecklistDefinition =
      await this.checklistDefinitionRepository.findOne({
        where: { id: checklistDefinitionId },
      });

    if (!existingChecklistDefinition) {
      throw new NotFoundException(auditHttpError('AUDIT_032'));
    }

    // Check if checklist definition is in use by any audit instance
    const auditInstancesUsingChecklist = await this.auditInstanceRepository
      .createQueryBuilder('auditInstance')
      .innerJoin('auditInstance.checklistVersions', 'checklistVersion')
      .innerJoin(
        'checklistVersion.checklistDefinitionVersion',
        'checklistDefinitionVersion',
      )
      .where(
        'checklistDefinitionVersion.checklistDefinitionId = :checklistDefinitionId',
        {
          checklistDefinitionId: checklistDefinitionId,
        },
      )
      .andWhere('auditInstance.deleted = false', { deleted: false })
      .getCount();

    if (auditInstancesUsingChecklist > 0) {
      throw new BadRequestException(auditHttpError('AUDIT_035'));
    }

    existingChecklistDefinition.title = `${
      existingChecklistDefinition.title
    }_DELETED_${Date.now()}`;
    existingChecklistDefinition.deleted = true;
    await this.checklistDefinitionRepository.save(existingChecklistDefinition);
  }

  private resolvedLinkedNcId(dto: {
    linkedNcId?: string | null;
    raisedNc?: string | boolean;
  }): string | null | undefined {
    if (typeof dto.linkedNcId === 'string') {
      const trimmed = dto.linkedNcId.trim();
      return trimmed || null;
    }
    if (dto.raisedNc === 'false' || dto.raisedNc === false) return null;
    return undefined;
  }

  private async detachOtherFindingsFromNonConformity(
    manager: EntityManager,
    nonConformityId: string,
    findingId?: string,
  ): Promise<void> {
    if (findingId) {
      await manager.query(
        `UPDATE audit_findings SET non_conformity = NULL WHERE non_conformity = ? AND id <> ?`,
        [nonConformityId, findingId],
      );
      return;
    }
    await manager.query(
      `UPDATE audit_findings SET non_conformity = NULL WHERE non_conformity = ?`,
      [nonConformityId],
    );
  }

  private async syncNonConformityAuditLink(
    manager: EntityManager,
    findingId: string,
    auditInstanceId: string,
    linkedNcId: string | null,
  ): Promise<void> {
    await manager.query(
      `UPDATE non_conformities SET finding_id = NULL, audit_id = NULL WHERE finding_id = ?`,
      [findingId],
    );
    if (!linkedNcId) return;
    const instance = await manager.findOne(AuditInstance, {
      where: { id: auditInstanceId },
    });
    await manager.query(
      `UPDATE non_conformities SET finding_id = ?, audit_id = ? WHERE id = ?`,
      [findingId, instance?.auditId ?? null, linkedNcId],
    );
  }

  //Audit Findings Methods
  async createAuditFinding(
    auditFindingDto: CreateAuditFindingDto,
    user: UserRequest,
    files?: any[],
  ): Promise<{ id: string }> {
    const queryRunner =
      this.auditFindingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //check if audit instance exist
      const auditInstance = await this.auditInstanceRepository.findOne({
        where: { id: auditFindingDto.auditInstanceId },
      });

      if (!auditInstance) {
        throw new NotFoundException({
          message: 'Audit instance not found',
          key: 'AUDIT_030',
        });
      }

      // Prevent creating findings when audit is ON_HOLD or COMPLETED
      if (
        auditInstance.status === AuditInstanceStatus.ON_HOLD ||
        auditInstance.status === AuditInstanceStatus.COMPLETED
      ) {
        throw new BadRequestException({
          message:
            'Cannot create audit findings when the audit is on hold or completed',
          key: 'AUDIT_036',
        });
      }

      // check if team member exist in case provided
      let teamMember;
      if (auditFindingDto.auditTeamMemberId) {
        teamMember = await this.auditInstanceRepository
          .createQueryBuilder('auditInstance')
          .leftJoinAndSelect('auditInstance.auditTeamMembers', 'teamMembers')
          .where('auditInstance.id = :auditInstanceId', {
            auditInstanceId: auditFindingDto.auditInstanceId,
          })
          .andWhere('teamMembers.id = :teamMemberId', {
            teamMemberId: auditFindingDto.auditTeamMemberId,
          })
          .getOne();

        if (!teamMember) {
          throw new NotFoundException({
            message: 'Team member not found in this audit instance',
            key: 'AUDIT_038',
          });
        }
      }

      if (Array.isArray(auditFindingDto.evidences)) {
        auditFindingDto.evidences = auditFindingDto.evidences.map((e) =>
          typeof e === 'string' ? JSON.parse(e) : e,
        );
      }

      // check if audit checklist response exist in case provided
      if (auditFindingDto.auditChecklistResponseId) {
        const auditChecklistResponse = await queryRunner.manager.findOne(
          AuditChecklistResponse,
          {
            where: {
              id: auditFindingDto.auditChecklistResponseId,
              auditInstance: {
                id: auditFindingDto.auditInstanceId,
              } as AuditInstance,
            },
          },
        );
        if (!auditChecklistResponse) {
          throw new BadRequestException({
            message: 'Audit checklist response not found',
            key: 'AUDIT_039',
          });
        }
      }

      // Attach to checklist question: reuse or create response shell (do not wipe answers)
      let resolvedChecklistResponseId =
        auditFindingDto.auditChecklistResponseId || null;
      if (
        !resolvedChecklistResponseId &&
        (auditFindingDto as any).questionDefinitionId
      ) {
        const questionDefinitionId = (auditFindingDto as any)
          .questionDefinitionId as string;
        const existingResponse = await queryRunner.manager.findOne(
          AuditChecklistResponse,
          {
            where: {
              auditInstance: {
                id: auditFindingDto.auditInstanceId,
              } as AuditInstance,
              questionDefinition: { id: questionDefinitionId } as any,
            },
          },
        );
        if (existingResponse) {
          resolvedChecklistResponseId = existingResponse.id;
        } else {
          const newResponse = queryRunner.manager.create(
            AuditChecklistResponse,
            {
              auditInstance: {
                id: auditFindingDto.auditInstanceId,
              } as AuditInstance,
              questionDefinition: { id: questionDefinitionId } as any,
              respondedAt: Date.now(),
            },
          );
          const savedResponse = await queryRunner.manager.save(newResponse);
          resolvedChecklistResponseId = savedResponse.id;
        }
      }

      //check if audit finding title already exists
      const existingAuditFinding = await this.auditFindingRepository.findOne({
        where: {
          title: auditFindingDto.title,
          auditInstance: {
            id: auditFindingDto.auditInstanceId,
          } as AuditInstance,
        },
      });
      if (existingAuditFinding) {
        throw new BadRequestException({
          message: 'Audit finding title already exists',
          key: 'AUDIT_040',
        });
      }

      const linkedNcId = this.resolvedLinkedNcId(auditFindingDto);
      if (linkedNcId) {
        await this.detachOtherFindingsFromNonConformity(
          queryRunner.manager,
          linkedNcId,
        );
      }

      const auditFinding = queryRunner.manager.create(AuditFinding, {
        title: auditFindingDto.title,
        auditInstance: { id: auditFindingDto.auditInstanceId } as AuditInstance,
        description: auditFindingDto.description,
        classification: auditFindingDto.classification,
        createdAt: new Date().valueOf(),
        auditTeamMember: auditFindingDto.auditTeamMemberId
          ? ({ id: auditFindingDto.auditTeamMemberId } as AuditTeamMember)
          : null,
        auditChecklistResponse: resolvedChecklistResponseId
          ? ({
              id: resolvedChecklistResponseId,
            } as AuditChecklistResponse)
          : null,
        raisedNc: linkedNcId
          ? true
          : auditFindingDto.raisedNc === 'true',
        nonConformity: linkedNcId
          ? ({ id: linkedNcId } as NonConformity)
          : null,
      });

      await queryRunner.manager.save(auditFinding);
      if (linkedNcId) {
        await this.syncNonConformityAuditLink(
          queryRunner.manager,
          auditFinding.id,
          auditFindingDto.auditInstanceId,
          linkedNcId,
        );
      }

      // Process evidences and files
      await this.createAuditFindingEvidences(
        auditFindingDto.evidences,
        files,
        user,
        queryRunner,
        auditFinding.id,
      );

      await queryRunner.commitTransaction();
      return { id: auditFinding.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException({
        message: 'Failed to create audit finding: ' + error.message,
        key: 'AUDIT_041',
      });
    } finally {
      await queryRunner.release();
    }
  }

  async findAllAuditFindings(
    user: UserRequest,
    filter: any,
  ): Promise<AuditFindingResponseDTO[]> {
    try {
      const auditInstance = await this.auditInstanceRepository.findOne({
        where: { id: filter.auditInstanceId },
      });
      if (!auditInstance) {
        throw new NotFoundException({
          message: 'Audit instance not found',
          key: 'AUDIT_030',
        });
      }

      const auditFindings = await this.auditFindingRepository
        .createQueryBuilder('auditFinding')
        .leftJoinAndSelect('auditFinding.auditTeamMember', 'auditTeamMember')
        .leftJoinAndSelect(
          'auditFinding.auditFindingEvidences',
          'auditFindingEvidences',
        )
        .leftJoinAndSelect('auditFinding.nonConformity', 'nonConformity')
        .leftJoinAndSelect('auditFinding.auditInstance', 'auditInstance')
        .leftJoinAndSelect(
          'auditFinding.auditChecklistResponse',
          'auditChecklistResponse',
        )
        .leftJoinAndSelect(
          'auditChecklistResponse.questionDefinition',
          'questionDefinition',
        )
        .leftJoinAndSelect('auditTeamMember.auditPersonnel', 'auditPersonnel')
        .andWhere('auditFinding.audit_instance_id = :auditInstanceId', {
          auditInstanceId: filter.auditInstanceId,
        });

      if (filter.classification) {
        auditFindings.andWhere(
          'auditFinding.classification = :classification',
          {
            classification: filter.classification,
          },
        );
      }

      if (filter.teamMemberId) {
        auditFindings.andWhere(
          'auditFinding.auditTeamMember.id = :teamMemberId',
          {
            teamMemberId: filter.teamMemberId,
          },
        );
      }

      if (filter.raisedNc !== undefined && filter.raisedNc !== '') {
        auditFindings.andWhere('auditFinding.raisedNc = :raisedNc', {
          raisedNc: filter.raisedNc === 'true',
        });
      }

      if (filter.search) {
        auditFindings.andWhere('LOWER(auditFinding.title) LIKE :search', {
          search: `%${filter.search}%`,
        });
      }

      const results = await auditFindings.getMany();

      return results.map((finding) => ({
        id: finding.id,
        title: finding.title,
        questionText:
          finding.auditChecklistResponse?.questionDefinition?.questionText ||
          null,
        classification: finding.classification,
        numberOfEvidences: finding.auditFindingEvidences?.length || 0,
        auditTeamMember: finding.auditTeamMember
          ? {
              id: finding.auditTeamMember.id,
              fname: finding.auditTeamMember.auditPersonnel?.firstName || null,
              lname: finding.auditTeamMember.auditPersonnel?.lastName || null,
            }
          : null,
        raisedNc: finding.raisedNc,
        nonConformity:
          finding.raisedNc && finding.nonConformity
            ? {
                id: finding.nonConformity.id,
                name: finding.nonConformity.name,
                problemStatement: finding.nonConformity.problemStatement,
                dueDate: finding.nonConformity.dueDate,
                auditId: finding.nonConformity.auditId ?? null,
                findingId: finding.nonConformity.findingId ?? finding.id,
              }
            : undefined,
        evidences:
          finding.auditFindingEvidences
            ?.map((e: any) => e.description)
            .filter(Boolean) || [],
        recommendations:
          (finding as any).auditChecklistResponse?.auditorObservation ?? null,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException({
        message: 'Failed to find audit findings: ' + error.message,
        key: 'AUDIT_042',
      });
    }
  }

  async findOneAuditFinding(
    id: string,
    user: UserRequest,
    instanceId: string,
  ): Promise<AuditFindingDetailResponseDTO> {
    try {
      const auditInstance = await this.auditInstanceRepository.findOne({
        where: { id: instanceId },
      });
      if (!auditInstance) {
        throw new NotFoundException({
          message: 'Audit instance not found',
          key: 'AUDIT_030',
        });
      }

      const finding = await this.auditFindingRepository
        .createQueryBuilder('auditFinding')
        .leftJoinAndSelect(
          'auditFinding.auditFindingEvidences',
          'auditFindingEvidences',
        )
        .leftJoinAndSelect('auditFindingEvidences.document', 'document')
        .leftJoinAndSelect('auditFinding.auditTeamMember', 'auditTeamMember')
        .leftJoinAndSelect('auditFinding.nonConformity', 'nonConformity')
        .leftJoinAndSelect(
          'auditFinding.auditChecklistResponse',
          'auditChecklistResponse',
        )
        .where('auditFinding.id = :id', { id })
        .andWhere('auditFinding.audit_instance_id = :instanceId', {
          instanceId: instanceId,
        })
        .getOne();

      if (!finding) {
        throw new NotFoundException({
          message: 'Audit finding not found',
          key: 'AUDIT_043',
        });
      }

      // Transform the finding to match the expected frontend structure
      const transformedFinding = {
        id: finding.id,
        title: finding.title,
        description: finding.description,
        classification: finding.classification,
        linkedNcId: finding.nonConformity?.id || null,
        ncName: finding.nonConformity?.name || null,
        nonConformity: finding.nonConformity,
        raisedNc: finding.raisedNc,
        createdAt: finding.createdAt,
        auditTeamMember: finding.auditTeamMember,
        auditChecklistResponse: finding.auditChecklistResponse,
        evidences:
          finding.auditFindingEvidences?.map((evidence: any) => ({
            id: evidence.id,
            description: evidence.description,
            documentName: evidence.document?.title || null,
            evidenceType: evidence.evidenceType,
            documentId: evidence.document?.id || null,
            fileName: evidence.evidenceFileUrl || null,
          })) || [],
      };

      return transformedFinding;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException({
        message: 'Failed to find audit finding: ' + error.message,
        key: 'AUDIT_044',
      });
    }
  }

  async updateAuditFinding(
    id: string,
    auditFindingDto: UpdateAuditFindingDto,
    user: UserRequest,
    files?: any[],
  ): Promise<{ id: string }> {
    const queryRunner =
      this.auditFindingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (Array.isArray(auditFindingDto.evidences)) {
        auditFindingDto.evidences = auditFindingDto.evidences.map((e) =>
          typeof e === 'string' ? JSON.parse(e) : e,
        );
      }

      // Permission Check
      const auditInstance = await this.auditInstanceRepository.findOne({
        where: { id: auditFindingDto.auditInstanceId },
      });
      if (!auditInstance) {
        throw new NotFoundException({
          message: 'Audit instance not found',
          key: 'AUDIT_030',
        });
      }

      const existingFinding = await this.auditFindingRepository.findOne({
        where: { id },
        relations: ['auditFindingEvidences'],
      });

      if (!existingFinding) {
        throw new NotFoundException({
          message: 'Audit finding not found',
          key: 'AUDIT_043',
        });
      }

      if (auditFindingDto.title) {
        // Check if title already exists
        const existingWithTitle = await this.auditFindingRepository.findOne({
          where: {
            title: auditFindingDto.title,
            auditInstance: { id: auditFindingDto.auditInstanceId },
            id: Not(id),
          },
        });

        if (existingWithTitle) {
          throw new BadRequestException({
            message: 'An audit finding with this title already exists',
            key: 'AUDIT_045',
          });
        }

        existingFinding.title = auditFindingDto.title;
      }
      if (auditFindingDto.description)
        existingFinding.description = auditFindingDto.description;
      if (auditFindingDto.classification)
        existingFinding.classification = auditFindingDto.classification;

      const linkedNcId = this.resolvedLinkedNcId(auditFindingDto);
      if (linkedNcId) {
        await this.detachOtherFindingsFromNonConformity(
          queryRunner.manager,
          linkedNcId,
          existingFinding.id,
        );
        existingFinding.nonConformity = {
          id: linkedNcId,
        } as NonConformity;
        existingFinding.raisedNc = true;
      } else if (linkedNcId === null) {
        existingFinding.nonConformity = null;
        existingFinding.raisedNc = false;
      } else if (auditFindingDto.raisedNc !== undefined) {
        existingFinding.raisedNc = auditFindingDto.raisedNc === 'true';
      }
      if (auditFindingDto.auditTeamMemberId)
        existingFinding.auditTeamMember = {
          id: auditFindingDto.auditTeamMemberId,
        } as AuditTeamMember;
      if (auditFindingDto.deleteEvidenceIds?.length > 0) {
        const evidencesToDelete = await queryRunner.manager.find(
          AuditFindingEvidence,
          {
            where: {
              id: In(auditFindingDto.deleteEvidenceIds),
            },
          },
        );

        for (const evidence of evidencesToDelete) {
          if (evidence.evidenceFileUrl) {
            await this.fileService.deleteFile(evidence.evidenceFileUrl);
          }
        }

        // Remove from parent relation
        existingFinding.auditFindingEvidences =
          existingFinding.auditFindingEvidences.filter(
            (e) => !auditFindingDto.deleteEvidenceIds.includes(e.id),
          );

        // Remove from DB
        await queryRunner.manager.remove(
          AuditFindingEvidence,
          evidencesToDelete,
        );
      }

      await queryRunner.manager.save(existingFinding);
      if (linkedNcId !== undefined) {
        await this.syncNonConformityAuditLink(
          queryRunner.manager,
          existingFinding.id,
          auditFindingDto.auditInstanceId,
          linkedNcId,
        );
      }

      // Handle new evidences (EXACTLY as in createAuditFinding)
      await this.createAuditFindingEvidences(
        auditFindingDto.evidences,
        files,
        user,
        queryRunner,
        existingFinding.id,
      );
      await queryRunner.commitTransaction();
      return { id: existingFinding.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException({
        message: 'Failed to update audit finding: ' + error.message,
        key: 'AUDIT_046',
      });
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAuditFinding(id: string, user: User): Promise<{ id: string }> {
    const queryRunner =
      this.auditFindingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auditFinding = await queryRunner.manager.findOne(AuditFinding, {
        where: { id },
        relations: ['auditFindingEvidences'],
      });

      if (!auditFinding) {
        throw new NotFoundException({
          message: 'Audit finding not found',
          key: 'AUDIT_043',
        });
      }

      const deletedFindingId = auditFinding.id;

      await queryRunner.manager.query(
        `UPDATE non_conformities SET finding_id = NULL, audit_id = NULL WHERE finding_id = ?`,
        [deletedFindingId],
      );

      // Delete all file evidences from S3
      const fileEvidences = auditFinding.auditFindingEvidences.filter(
        (evidence) =>
          evidence.evidenceType ===
          AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE,
      );

      for (const evidence of fileEvidences) {
        if (evidence.evidenceFileUrl) {
          await this.fileService.deleteFile(evidence.evidenceFileUrl);
        }
      }

      // Delete all evidences
      await queryRunner.manager.remove(auditFinding.auditFindingEvidences);

      // Delete the audit finding
      await queryRunner.manager.remove(auditFinding);

      await queryRunner.commitTransaction();
      return { id: deletedFindingId };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException({
        message: 'Failed to delete audit finding: ' + error.message,
        key: 'AUDIT_047',
      });
    } finally {
      await queryRunner.release();
    }
  }

  async getNotificationInfo(
    data: NotificationInfoParam,
  ): Promise<NotificationInfoResponse> {
    const none = (): NotificationInfoResponse => ({
      skip: true,
      route: '',
      recipients: [],
    });
    try {
      const { entityId, subject, method, userId } = data;
      switch (subject) {
        case 'audit_roles': {
          const auditRole = await this.auditRoleRepository.findOne({
            where: { id: String(entityId) },
            relations: ['createdBy'],
          });
          if (!auditRole) return none();
          const message = this.mapAuditRoleMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            '',
            this.recipientsFor(
              [auditRole.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'audit_personnels': {
          const auditPersonnel = await this.auditPersonnelRepository.findOne({
            where:
              method === 'deleteAuditPersonnel'
                ? { id: String(entityId) }
                : { id: String(entityId), deleted: false },
            relations: ['createdBy', 'user'],
          });
          if (!auditPersonnel) return none();
          const message = this.mapAuditPersonnelMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            '',
            this.recipientsFor(
              [auditPersonnel.createdBy, auditPersonnel.user, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'audit_document_types': {
          const documentType = await this.auditDocumentTypeRepository.findOne({
            where: { id: String(entityId) },
            relations: ['createdBy'],
          });
          if (!documentType) return none();
          const message = this.mapAuditDocumentTypeMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            '',
            this.recipientsFor(
              [documentType.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'audit_programs': {
          const auditProgram = await this.auditProgramRepository.findOne({
            where: { id: String(entityId) },
            relations: ['createdBy'],
          });
          if (!auditProgram) return none();
          const message = this.mapAuditProgramMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            auditProgram.id,
            this.recipientsFor(
              [auditProgram.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'audit_checklist_responses': {
          const response = await this.auditChecklistResponseRepository.findOne({
            where: { id: String(entityId) },
            relations: ['auditInstance', 'auditInstance.auditProgram'],
          });
          if (!response?.auditInstance?.auditProgram) return none();
          const message = this.mapAuditChecklistResponseMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            `${response.auditInstance.auditProgram.id}/instances/${response.auditInstance.id}`,
            this.recipientsFor(teamUsers, message, userId),
          );
        }
        case 'audit_findings': {
          const finding = await this.auditFindingRepository.findOne({
            where: { id: String(entityId) },
            relations: ['auditInstance', 'auditInstance.auditProgram'],
          });
          if (!finding?.auditInstance?.auditProgram) return none();
          const message = this.mapAuditFindingMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            `${finding.auditInstance.auditProgram.id}/instances/${finding.auditInstance.id}`,
            this.recipientsFor(teamUsers, message, userId),
          );
        }
        case 'audit_activity_types': {
          const activityType = await this.auditActivityTypeRepository.findOne({
            where: { id: String(entityId) },
            relations: ['createdBy'],
          });
          if (!activityType) return none();
          const message = this.mapAuditActivityTypeMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          return this.notificationResult(
            '',
            this.recipientsFor(
              [activityType.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        case 'audit_instances': {
          const auditInstance = await this.auditInstanceRepository.findOne({
            where: { id: String(entityId) },
            relations: [
              'auditProgram',
              'auditTeamMembers',
              'auditTeamMembers.auditPersonnel',
              'auditTeamMembers.auditPersonnel.user',
            ],
          });
          if (!auditInstance?.auditProgram) return none();
          const message = this.mapAuditInstanceMessage(method);
          const teamUsers = await this.usersForTeams([], subject, userId);
          const personnel = (auditInstance.auditTeamMembers || []).map(
            (member) => member.auditPersonnel?.user,
          );
          return this.notificationResult(
            `${auditInstance.auditProgram.id}/instances/${auditInstance.id}`,
            this.recipientsFor([...personnel, ...teamUsers], message, userId),
          );
        }
        case 'audit_checklist_definitions': {
          const checklistDefinition =
            await this.checklistDefinitionRepository.findOne({
              where: { id: String(entityId) },
              relations: ['teams', 'teams.team', 'createdBy'],
            });
          if (!checklistDefinition) return none();
          const message = this.mapAuditChecklistDefinitionMessage(method);
          const teamUsers = await this.usersForTeams(
            this.teamIdsFrom(checklistDefinition.teams),
            subject,
            userId,
          );
          return this.notificationResult(
            '',
            this.recipientsFor(
              [checklistDefinition.createdBy, ...teamUsers],
              message,
              userId,
            ),
          );
        }
        default:
          return none();
      }
    } catch (error) {
      this.logger.error(`Error in getNotificationInfo: ${error.message}`);
      return none();
    }
  }

  private mapAuditRoleMessage(method: string): string {
    switch (method) {
      case 'createAuditRole':
        return 'created a new audit role';
      case 'updateAuditRole':
        return 'updated an audit role';
      case 'removeAuditRole':
        return 'deleted an audit role';
      default:
        return 'modified an audit role';
    }
  }

  private mapAuditDocumentTypeMessage(method: string): string {
    switch (method) {
      case 'createAuditDocumentType':
        return 'created a new audit document type';
      case 'updateAuditDocumentType':
        return 'updated an audit document type';
      case 'removeAuditDocumentType':
        return 'deleted an audit document type';
      default:
        return 'modified an audit document type';
    }
  }

  private mapAuditPersonnelMessage(method: string): string {
    switch (method) {
      case 'createAuditPersonnel':
        return 'created a new audit personnel';
      case 'updateAuditPersonnel':
        return 'updated an audit personnel';
      case 'deleteAuditPersonnel':
        return 'deleted an audit personnel';
      default:
        return 'modified an audit personnel';
    }
  }

  private mapAuditProgramMessage(method: string): string {
    switch (method) {
      case 'createAuditProgram':
        return 'created a new audit program';
      case 'updateAuditProgram':
        return 'updated an audit program';
      case 'deleteAuditProgram':
        return 'deleted an audit program';
      default:
        return 'modified an audit program';
    }
  }

  private mapAuditFindingMessage(method: string): string {
    switch (method) {
      case 'createAuditFinding':
        return 'created a new audit finding';
      case 'updateAuditFinding':
        return 'updated an audit finding';
      case 'deleteAuditFinding':
        return 'deleted an audit finding';
      default:
        return 'modified an audit finding';
    }
  }

  private mapAuditChecklistResponseMessage(method: string): string {
    switch (method) {
      case 'createAuditChecklistResponse':
        return 'created a new audit checklist response';
      case 'updateAuditChecklistResponse':
        return 'updated an audit checklist response';
      case 'deleteAuditChecklistResponse':
        return 'deleted an audit checklist response';
      default:
        return 'modified an audit checklist response';
    }
  }

  private mapAuditActivityTypeMessage(method: string): string {
    switch (method) {
      case 'addActivityType':
        return 'created a new audit activity type';
      case 'updateActivityType':
        return 'updated an audit activity type';
      case 'deleteActivityType':
        return 'deleted an audit activity type';
      default:
        return 'modified an audit activity type';
    }
  }

  private mapAuditInstanceMessage(method: string): string {
    switch (method) {
      case 'createAuditInstance':
        return 'created a new audit instance';
      case 'updateAuditInstance':
        return 'updated an audit instance';
      case 'deleteAuditInstance':
        return 'deleted an audit instance';
      case 'changeAuditInstanceStatus':
        return 'changed audit instance status';
      default:
        return 'modified an audit instance';
    }
  }

  private mapAuditChecklistDefinitionMessage(method: string): string {
    switch (method) {
      case 'createChecklistDefinition':
        return 'created a new audit checklist definition';
      case 'updateChecklistDefinition':
        return 'updated an audit checklist definition';
      case 'removeChecklistDefinition':
        return 'deleted an audit checklist definition';
      default:
        return 'modified an audit checklist definition';
    }
  }

  // Helper method to compute audit ID for an instance
  private async computeAuditId(
    programCode: string,
    scheduledTimestamp: number,
    auditProgramId: string,
    entityManager: any, // EntityManager from queryRunner.manager or repository.manager
  ): Promise<string> {
    const scheduledDate = new Date(scheduledTimestamp);
    const yyyy = scheduledDate.getUTCFullYear();
    const mm = String(scheduledDate.getUTCMonth() + 1).padStart(2, '0');

    // Find all instances for the same audit program to get the maximum increment
    const existingInstances = await entityManager
      .createQueryBuilder(AuditInstance, 'ai')
      .select(['ai.auditId'])
      .andWhere('ai.auditProgramId = :programId', { programId: auditProgramId })
      .andWhere('ai.auditId IS NOT NULL')
      .andWhere('ai.auditId LIKE :like', { like: `${programCode}-%/%` })
      .getMany();

    let nextInc = 1;
    if (existingInstances && existingInstances.length > 0) {
      // Extract all increment numbers from existing audit IDs for this program
      const increments = existingInstances
        .map((instance) => {
          const parts = (instance.auditId || '').split('/');
          const incStr = parts[1] || '0';
          return parseInt(incStr, 10);
        })
        .filter((inc) => !isNaN(inc));

      if (increments.length > 0) {
        const maxInc = Math.max(...increments);
        nextInc = maxInc + 1;
      }
    }

    return `${programCode}-${yyyy}-${mm}/${String(nextInc).padStart(2, '0')}`;
  }

  // AuditInstance CRUD methods
  async createAuditInstance(
    auditInstanceDto: CreateAuditInstanceDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    // Validate that audit program exists and belongs to the user's client
    const auditProgram = await this.auditProgramRepository.findOne({
      where: { id: auditInstanceDto.auditProgramId },
    });

    if (!auditProgram) {
      throw new NotFoundException(auditHttpError('AUDIT_026'));
    }
    const checklistDefinitions: ChecklistDefinition[] = [];
    // Validate checklist definition if provided
    if (auditInstanceDto.checklistDefinitionIds) {
      for (const checklistDefinitionId of auditInstanceDto.checklistDefinitionIds) {
        const checklistDefinition = await this.checklistDefinitionRepository
          .createQueryBuilder('checklistDefinition')
          .leftJoinAndSelect('checklistDefinition.versions', 'versions')
          .where('checklistDefinition.id = :id', { id: checklistDefinitionId })
          .andWhere(
            'versions.createdAt = (SELECT MAX(v2.created_at) FROM checklist_definition_versions v2 WHERE v2.checklist_definition_id = checklistDefinition.id)',
          )
          .getOne();

        if (!checklistDefinition) {
          throw new NotFoundException(auditHttpError('AUDIT_032'));
        }

        // Prevent using draft checklist definitions for audit instances
        if (checklistDefinition.isDraft) {
          throw new BadRequestException(auditHttpError('AUDIT_048'));
        }
        checklistDefinitions.push(checklistDefinition);
      }
    }

    // Compute auditId using helper method
    const programCode = (auditProgram.title || '').trim();
    const scheduledTimestamp = auditInstanceDto.startDate ?? Date.now();
    const computedAuditId = await this.computeAuditId(
      programCode,
      scheduledTimestamp,
      auditProgram.id,
      this.auditInstanceRepository.manager,
    );

    const auditInstance = this.auditInstanceRepository.create({
      ...auditInstanceDto,
      scheduledByUserId: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      auditId: computedAuditId,
      criteria: auditInstanceDto.criteria?.trim() || null,
      auditTeamMembers: auditInstanceDto.teamMembers?.map(
        (teamMember) =>
          ({
            auditPersonnelId: teamMember.auditPersonnel.id,
            auditRoleId: teamMember.auditRole.id,
            createdById: user.id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }) as AuditTeamMember,
      ),
    });

    auditInstance.checklistVersions = checklistDefinitions.map(
      (checklistDefinition) => {
        return {
          auditInstance,
          checklistDefinitionVersion: {
            id: checklistDefinition.versions[0].id,
          } as any,
        } as AuditInstanceChecklistVersion;
      },
    );

    const savedAuditInstance =
      await this.auditInstanceRepository.save(auditInstance);

    if (auditInstanceDto.isUnplanned) {
      await this.linkAuditInstanceToUnplannedScheduleEntry(
        savedAuditInstance,
        auditInstanceDto.unplannedProcess,
        auditInstanceDto.amendmentReason,
      );
    } else {
      await this.linkAuditInstanceToScheduleEntry(
        savedAuditInstance,
        auditInstanceDto.scheduleEntryId,
        auditInstanceDto.amendmentReason,
      );
    }

    await this.notifyAuditPersonnelIfScheduled(
      savedAuditInstance,
      auditProgram,
      auditInstanceDto.teamMembers?.map((tm) => tm.auditPersonnel.id) || [],
    );
    return { id: savedAuditInstance.id };
  }

  async findAllAuditInstances(
    user: UserRequest,
    filterDto: any,
  ): Promise<AllAuditInstanceResponseDto[]> {
    const query = this.auditInstanceRepository
      .createQueryBuilder('auditInstance')
      .leftJoinAndSelect('auditInstance.auditProgram', 'auditProgram')
      .leftJoinAndSelect('auditProgram.auditActivityType', 'auditActivityType')
      .leftJoinAndSelect('auditInstance.scheduledBy', 'scheduledBy')
      .andWhere('auditInstance.deleted = :deleted', { deleted: false })
      .andWhere('auditProgram.deleted = :programDeleted', {
        programDeleted: false,
      });

    const excludeDraft = filterDto.excludeDraft ?? filterDto.excludedraft;
    if (excludeDraft) {
      query
        .andWhere('auditInstance.status != :draftStatus', {
          draftStatus: AuditInstanceStatus.DRAFT,
        })
        .andWhere('auditProgram.status != :programDraftStatus', {
          programDraftStatus: AuditProgramStatus.DRAFT,
        });
    }

    if (filterDto.status) {
      query.andWhere('auditInstance.status = :status', {
        status: filterDto.status,
      });
    }

    if (filterDto.auditProgramId) {
      query.andWhere('auditInstance.auditProgramId = :auditProgramId', {
        auditProgramId: filterDto.auditProgramId,
      });
    }

    if (filterDto.criteria?.trim()) {
      query.andWhere('LOWER(auditInstance.criteria) LIKE LOWER(:criteria)', {
        criteria: `%${String(filterDto.criteria).trim()}%`,
      });
    }

    if (filterDto.location) {
      query.andWhere('auditInstance.location LIKE :location', {
        location: `%${filterDto.location}%`,
      });
    }

    if (filterDto.search) {
      query.andWhere('LOWER(auditInstance.auditId) LIKE LOWER(:search)', {
        search: `%${filterDto.search}%`,
      });
    }

    const sortMap: Record<string, string> = {
      startDate: 'auditInstance.startDate',
    };
    const sortByKey = filterDto?.sortBy as string | undefined;
    const sortColumn = sortByKey ? sortMap[sortByKey] : undefined;
    if (sortColumn) {
      const sortDirRaw = String(filterDto?.sortDir || 'asc').toLowerCase();
      const sortDirection = sortDirRaw === 'desc' ? 'DESC' : 'ASC';
      query.orderBy(sortColumn, sortDirection);
    }

    const instances = await query.getMany();
    if (!instances || instances.length === 0) {
      return [];
    }

    return instances.map((instance) =>
      this.formatAllAuditInstanceResponse(instance),
    );
  }

  private formatAllAuditInstanceResponse(
    auditInstance: AuditInstance,
  ): AllAuditInstanceResponseDto {
    return {
      id: auditInstance.id,
      startDate: auditInstance.startDate,
      endDate: auditInstance.endDate,
      status: auditInstance.status,
      scheduledBy: {
        id: auditInstance.scheduledBy.id,
        fname: auditInstance.scheduledBy.fname,
        lname: auditInstance.scheduledBy.lname,
      },
      location: auditInstance.location,
      auditId: auditInstance.auditId,
      auditProgram: {
        id: auditInstance.auditProgram.id,
        title: auditInstance.auditProgram.title,
        auditActivityType: auditInstance.auditProgram.auditActivityType
          ? {
              id: auditInstance.auditProgram.auditActivityType.id,
              name: auditInstance.auditProgram.auditActivityType.name,
            }
          : undefined,
      },
      criteria: auditInstance.criteria || undefined,
    };
  }

  async findOneAuditInstance(
    id: string,
    user: UserRequest,
  ): Promise<AuditInstanceResponseDto> {
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id },
      relations: [
        'auditProgram',
        'auditProgram.auditActivityType',
        'checklistVersions',
        'checklistVersions.checklistDefinitionVersion',
        'checklistVersions.checklistDefinitionVersion.checklistDefinition',
        'scheduledBy',
        'auditTeamMembers',
        'auditTeamMembers.auditPersonnel',
        'auditTeamMembers.auditRole',
        'auditChecklistResponses',
        'auditChecklistResponses.questionDefinition',
        'auditChecklistResponses.questionDefinition.sectionDefinition',
        'auditChecklistResponses.questionDefinition.sectionDefinition.checklistDefinitionVersion',
        'auditChecklistResponses.questionDefinition.sectionDefinition.checklistDefinitionVersion.checklistDefinition',
        'auditChecklistResponses.auditFindings',
        'auditChecklistResponses.auditFindings.auditFindingEvidences',
        'auditChecklistResponses.auditFindings.nonConformity',
      ],
    });

    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    return this.formatAuditInstanceResponse(auditInstance);
  }

  async updateAuditInstance(
    id: string,
    auditInstanceDto: UpdateAuditInstanceDto,
    user: UserRequest,
  ): Promise<{ id: string }> {
    const existingAuditInstance = await this.auditInstanceRepository.findOne({
      where: { id },
      relations: ['auditTeamMembers', 'auditProgram'],
    });

    if (!existingAuditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    // Validate status - cannot update instances with certain statuses
    if (
      (existingAuditInstance.status === AuditInstanceStatus.COMPLETED ||
        existingAuditInstance.status === AuditInstanceStatus.CANCELLED ||
        existingAuditInstance.status === AuditInstanceStatus.ON_HOLD ||
        existingAuditInstance.status === AuditInstanceStatus.IN_PROGRESS) &&
      auditInstanceDto.auditSummary === undefined
    ) {
      throw new BadRequestException(
        auditHttpError('AUDIT_049', {
          params: { status: existingAuditInstance.status },
        }),
      );
    }

    // Validate audit program if being updated
    if (auditInstanceDto.auditProgramId) {
      const auditProgram = await this.auditProgramRepository.findOne({
        where: {
          id: auditInstanceDto.auditProgramId,
        },
      });

      if (!auditProgram) {
        throw new NotFoundException(auditHttpError('AUDIT_026'));
      }
    }

    const checklistDefinitions: ChecklistDefinition[] = [];
    // Validate checklist definition if being updated
    if (auditInstanceDto.assignedChecklistDefinitionIds) {
      for (const checklistDefinitionId of auditInstanceDto.assignedChecklistDefinitionIds) {
        const checklistDefinition = await this.checklistDefinitionRepository
          .createQueryBuilder('checklistDefinition')
          .leftJoinAndSelect('checklistDefinition.versions', 'versions')
          .where('checklistDefinition.id = :id', { id: checklistDefinitionId })
          .andWhere(
            'versions.createdAt = (SELECT MAX(v2.created_at) FROM checklist_definition_versions v2 WHERE v2.checklist_definition_id = checklistDefinition.id)',
          )
          .getOne();

        if (!checklistDefinition) {
          throw new NotFoundException(auditHttpError('AUDIT_032'));
        }

        // Prevent assigning draft checklist definitions to audit instances
        if (checklistDefinition.isDraft) {
          throw new BadRequestException(auditHttpError('AUDIT_050'));
        }
        checklistDefinitions.push(checklistDefinition);
      }
      // Update the checklist definition version to the latest version
      existingAuditInstance.checklistVersions = checklistDefinitions.map(
        (checklistDefinition) => {
          return {
            checklistDefinitionVersion: {
              id: checklistDefinition.versions[0].id,
            } as any,
            auditInstance: { id: existingAuditInstance.id } as any,
          } as AuditInstanceChecklistVersion;
        },
      );
    }

    // Update basic fields
    if (auditInstanceDto.startDate !== undefined) {
      existingAuditInstance.startDate = auditInstanceDto.startDate;
    }
    if (auditInstanceDto.endDate !== undefined) {
      existingAuditInstance.endDate = auditInstanceDto.endDate;
    }
    if (auditInstanceDto.location !== undefined) {
      existingAuditInstance.location = auditInstanceDto.location;
    }
    if (auditInstanceDto.status !== undefined) {
      existingAuditInstance.status = auditInstanceDto.status;
    }
    if (auditInstanceDto.auditDocumentId !== undefined) {
      existingAuditInstance.auditDocumentId = auditInstanceDto.auditDocumentId;
    }
    if (auditInstanceDto.scope !== undefined) {
      existingAuditInstance.scope = auditInstanceDto.scope;
    }
    if (auditInstanceDto.objective !== undefined) {
      existingAuditInstance.objective = auditInstanceDto.objective;
    }
    if (auditInstanceDto.criteria !== undefined) {
      existingAuditInstance.criteria =
        auditInstanceDto.criteria?.trim() || null;
    }
    if (auditInstanceDto.auditSummary !== undefined) {
      existingAuditInstance.auditSummary = auditInstanceDto.auditSummary;
    }

    // Handle team members update if provided
    if (auditInstanceDto.teamMembers !== undefined) {
      // Find newly added personnel by diffing incoming against existing
      const existingPersonnelIdsSet = new Set(
        (existingAuditInstance.auditTeamMembers || [])
          .map((tm: any) => tm.auditPersonnelId || tm.auditPersonnel?.id)
          .filter(Boolean),
      );
      const incomingPersonnelIds = auditInstanceDto.teamMembers.map(
        (tm) => tm.auditPersonnel.id,
      );
      const newlyAddedPersonnelIds = incomingPersonnelIds.filter(
        (id) => !existingPersonnelIdsSet.has(id),
      );

      // Assign new team members
      existingAuditInstance.auditTeamMembers = auditInstanceDto.teamMembers.map(
        (teamMember) =>
          ({
            id: teamMember.id,
            auditPersonnelId: teamMember.auditPersonnel.id,
            auditRoleId: teamMember.auditRole.id,
            createdById: user.id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }) as AuditTeamMember,
      );

      // Notify only newly added members
      if (newlyAddedPersonnelIds.length > 0) {
        await this.notifyAuditPersonnelIfScheduled(
          existingAuditInstance,
          existingAuditInstance.auditProgram,
          newlyAddedPersonnelIds,
        );
      }
    }

    existingAuditInstance.updatedAt = Date.now();

    await this.auditInstanceRepository.save(existingAuditInstance);

    if (auditInstanceDto.isUnplanned) {
      await this.linkAuditInstanceToUnplannedScheduleEntry(
        existingAuditInstance,
        auditInstanceDto.unplannedProcess,
        auditInstanceDto.amendmentReason,
      );
    } else {
      await this.linkAuditInstanceToScheduleEntry(
        existingAuditInstance,
        auditInstanceDto.scheduleEntryId,
        auditInstanceDto.amendmentReason,
      );
    }

    return { id: existingAuditInstance.id };
  }

  async deleteAuditInstance(
    id: string,
    user: UserRequest,
  ): Promise<{ id: string }> {
    const existingAuditInstance = await this.auditInstanceRepository.findOne({
      where: { id },
    });

    if (!existingAuditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    try {
      existingAuditInstance.deleted = true;
      await this.auditInstanceRepository.save(existingAuditInstance);
      return { id: existingAuditInstance.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(auditHttpError('AUDIT_051'));
    }
  }

  async changeAuditInstanceStatus(
    id: string,
    status: string,
    user: UserRequest,
  ): Promise<AuditInstanceResponseDto> {
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id },
      relations: [
        'auditProgram',
        'scheduledBy',
        'checklistDefinitionVersion',
        'checklistDefinitionVersion.checklistDefinition',
        'checklistDefinitionVersion.checklistDefinition.activityType',
        'checklistDefinitionVersion.sections',
        'checklistDefinitionVersion.sections.questions',
        'checklistDefinitionVersion.sections.subsections',
        'checklistDefinitionVersion.sections.subsections.questions',
        'checklistVersions',
        'checklistVersions.checklistDefinitionVersion',
        'checklistVersions.checklistDefinitionVersion.sections',
        'checklistVersions.checklistDefinitionVersion.sections.questions',
        'checklistVersions.checklistDefinitionVersion.sections.subsections',
        'checklistVersions.checklistDefinitionVersion.sections.subsections.questions',
        'auditChecklistResponses',
        'auditChecklistResponses.questionDefinition',
        'auditTeamMembers',
        'auditTeamMembers.auditPersonnel',
        'auditTeamMembers.auditRole',
        'auditProgram.scheduleEntries',
      ],
    });

    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    // Prevent starting an audit instance without any assigned checklists
    if (status === AuditInstanceStatus.IN_PROGRESS) {
      const hasChecklists =
        (auditInstance.checklistVersions &&
          auditInstance.checklistVersions.length > 0) ||
        (auditInstance.checklistDefinitionVersion &&
          auditInstance.checklistDefinitionVersion.id);

      if (!hasChecklists) {
        throw new BadRequestException(auditHttpError('AUDIT_052'));
      }
    }

    if (status === AuditInstanceStatus.COMPLETED) {
      // Collect all sections from all checklist versions assigned to this instance
      const allChecklistVersions = auditInstance.checklistVersions || [];
      const sectionEntities = allChecklistVersions.flatMap(
        (civ: any) => civ?.checklistDefinitionVersion?.sections || [],
      );

      const validQuestionIds = new Set<string>(
        sectionEntities.flatMap((section: any) => [
          // top-level section question ids
          ...(section?.questions || []).map((q: any) => q?.id).filter(Boolean),
          // one-level subsection question ids
          ...(section?.subsections || [])
            .flatMap((sub: any) =>
              (sub?.questions || []).map((q: any) => q?.id),
            )
            .filter(Boolean),
        ]),
      );

      const totalQuestions = validQuestionIds.size;
      const answeredQuestionIds = new Set<string>(
        (auditInstance.auditChecklistResponses || [])
          .map((resp: any) => resp?.questionDefinition?.id)
          .filter(
            (qid: string | undefined) => qid && validQuestionIds.has(qid),
          ) as string[],
      );
      const answeredQuestions = answeredQuestionIds.size;

      if (totalQuestions > 0 && answeredQuestions < totalQuestions) {
        throw new BadRequestException(
          auditHttpError('AUDIT_053', {
            params: {
              answered: answeredQuestions.toString(),
              total: totalQuestions.toString(),
            },
          }),
        );
      }
      // If there are zero questions across all versions, prevent accidental completion without data
      if (totalQuestions === 0) {
        throw new BadRequestException(auditHttpError('AUDIT_054'));
      }
    }

    auditInstance.status = status as any;
    auditInstance.updatedAt = Date.now();

    const updatedInstance =
      await this.auditInstanceRepository.save(auditInstance);
    return this.formatAuditInstanceResponse(updatedInstance);
  }

  private formatAuditInstanceResponse(
    auditInstance: AuditInstance,
  ): AuditInstanceResponseDto {
    const linkedScheduleEntry =
      auditInstance.auditProgram.scheduleEntries?.find(
        (entry) => entry.auditInstanceId === auditInstance.id && !entry.deleted,
      );

    return {
      id: auditInstance.id,
      auditId: (auditInstance as any).auditId,
      auditProgram: {
        id: auditInstance.auditProgram.id,
        title: auditInstance.auditProgram.title,
        objective: auditInstance.auditProgram.objective,
        scope: auditInstance.auditProgram.scope,
        auditActivityType: auditInstance.auditProgram.auditActivityType
          ? {
              id: auditInstance.auditProgram.auditActivityType.id,
              name: auditInstance.auditProgram.auditActivityType.name,
            }
          : undefined,
      },
      auditDocumentId: auditInstance.auditDocumentId,
      startDate: auditInstance.startDate,
      endDate: auditInstance.endDate,
      ChecklistDefinitions:
        auditInstance.checklistVersions
          ?.map((checklistVersion) => {
            const cdv = checklistVersion?.checklistDefinitionVersion;
            const cd = cdv?.checklistDefinition;
            if (!cdv || !cd) return undefined;
            return {
              id: cd.id,
              title: cd.title,
            };
          })
          .filter(Boolean) || [],
      status: auditInstance.status,
      scheduledBy: {
        id: auditInstance.scheduledBy.id,
        fname: auditInstance.scheduledBy.fname,
        lname: auditInstance.scheduledBy.lname,
      },
      location: auditInstance.location,
      scope: auditInstance.scope,
      objective: auditInstance.objective,
      criteria: auditInstance.criteria || undefined,
      auditSummary: auditInstance.auditSummary,
      createdAt: auditInstance.createdAt,
      updatedAt: auditInstance.updatedAt,
      teamMembers: auditInstance.auditTeamMembers?.map((teamMember) => ({
        id: teamMember.id,
        auditPersonnel: {
          id: teamMember.auditPersonnel.id,
          fname: teamMember.auditPersonnel.firstName,
          lname: teamMember.auditPersonnel.lastName,
          email: teamMember.auditPersonnel.email,
        },
        auditRole: {
          id: teamMember.auditRole.id,
          name: teamMember.auditRole.name,
        },
      })),
      scheduleEntry: linkedScheduleEntry
        ? {
            id: linkedScheduleEntry.id,
            year: Number(linkedScheduleEntry.year),
            month: Number(linkedScheduleEntry.month),
            process: linkedScheduleEntry.process,
            notes: linkedScheduleEntry.notes,
            isUnplanned: linkedScheduleEntry.isUnplanned,
            amendmentReason: linkedScheduleEntry.amendmentReason,
            auditInstanceId: auditInstance.id,
          }
        : undefined,
      // Include checklist responses and nested data for frontend-driven report composition
      auditChecklistResponses: (auditInstance as any).auditChecklistResponses
        ? (auditInstance as any).auditChecklistResponses.map(
            (response: any) => ({
              id: response.id,
              responseAnswer: response.responseAnswer,
              auditorObservation: response.auditorObservation,
              questionDefinition: response.questionDefinition
                ? {
                    id: response.questionDefinition.id,
                    questionText: response.questionDefinition.questionText,
                    orderIndex: response.questionDefinition.orderIndex,
                    sectionDefinition: response.questionDefinition
                      .sectionDefinition
                      ? {
                          id: response.questionDefinition.sectionDefinition.id,
                          title:
                            response.questionDefinition.sectionDefinition.title,
                          orderIndex:
                            response.questionDefinition.sectionDefinition
                              .orderIndex,
                          checklistDefinition: response.questionDefinition
                            .sectionDefinition.checklistDefinitionVersion
                            ?.checklistDefinition
                            ? {
                                id: response.questionDefinition
                                  .sectionDefinition.checklistDefinitionVersion
                                  .checklistDefinition.id,
                                title:
                                  response.questionDefinition.sectionDefinition
                                    .checklistDefinitionVersion
                                    .checklistDefinition.title,
                              }
                            : undefined,
                        }
                      : undefined,
                  }
                : undefined,
              auditFindings: response.auditFindings
                ? response.auditFindings.map((finding: any) => ({
                    id: finding.id,
                    title: finding.title,
                    description: finding.description,
                    classification: finding.classification,
                    raisedNc: finding.raisedNc,
                    nonConformity: finding.nonConformity
                      ? {
                          id: finding.nonConformity.id,
                          problemStatement:
                            finding.nonConformity.problemStatement,
                          dueDate: finding.nonConformity.dueDate,
                        }
                      : undefined,
                    auditFindingEvidences: finding.auditFindingEvidences
                      ? finding.auditFindingEvidences.map((e: any) => ({
                          id: e.id,
                          description: e.description,
                          evidenceType: e.evidenceType,
                          documentId: e.documentId,
                          documentName: e.documentName,
                          fileName: e.evidenceFileUrl,
                        }))
                      : [],
                  }))
                : [],
            }),
          )
        : [],
    } as any;
  }

  // Sends notification emails to audit personnels when an instance is in SCHEDULED status
  private async notifyAuditPersonnelIfScheduled(
    auditInstance: AuditInstance,
    auditProgram: AuditProgram,
    teamMemberPersonnelIds: string[],
  ): Promise<void> {
    try {
      if (auditInstance.status !== AuditInstanceStatus.SCHEDULED) {
        return;
      }

      const derivedPersonnelIds =
        teamMemberPersonnelIds && teamMemberPersonnelIds.length > 0
          ? teamMemberPersonnelIds
          : (auditInstance.auditTeamMembers
              ?.map((tm: any) => tm.auditPersonnel?.id || tm.auditPersonnelId)
              .filter(Boolean) as string[]) || [];

      if (!derivedPersonnelIds || derivedPersonnelIds.length === 0) {
        return;
      }

      const personnels = await this.auditPersonnelRepository.find({
        where: {
          id: In(derivedPersonnelIds),
          deleted: false,
        },
      });

      const startDateStr = auditInstance.startDate
        ? new Date(auditInstance.startDate).toLocaleDateString()
        : '';
      const endDateStr = auditInstance.endDate
        ? new Date(auditInstance.endDate).toLocaleDateString()
        : '';
      const dateRange = startDateStr
        ? endDateStr && endDateStr !== startDateStr
          ? `${startDateStr} - ${endDateStr}`
          : startDateStr
        : '';

      for (const p of personnels) {
        if (!p.email) continue;
        const emailPayload = {
          to: p.email,
          type: EmailType.NOTIFICATION,
          replaceString: {
            name: `${p.firstName} ${p.lastName}`.trim(),
            message: `You have been scheduled for an audit: '${
              auditProgram.title
            }'${dateRange ? ` on ${dateRange}` : ''}${
              auditInstance.location ? ` at ${auditInstance.location}` : ''
            }.`,
            link: `/check/audits/${auditProgram.id}/instances/${auditInstance.id}`,
          },
        };
        this.queuePublisher.sendEmail(emailPayload);
      }
    } catch (e) {
      this.logger.error('Failed to send audit scheduling emails', e as any);
    }
  }
  private formatChecklistDefinitionVersion(
    checklistDefinitionVersion: ChecklistDefinitionVersion,
  ): ChecklistDefinitionResponseDto {
    return {
      id: checklistDefinitionVersion.checklistDefinition.id,
      title: checklistDefinitionVersion.checklistDefinition.title,
      description: checklistDefinitionVersion.checklistDefinition.description,
      version: checklistDefinitionVersion.checklistDefinition.version,
      activityType: checklistDefinitionVersion.checklistDefinition.activityType
        ? {
            id: checklistDefinitionVersion.checklistDefinition.activityType.id,
            name: checklistDefinitionVersion.checklistDefinition.activityType
              .name,
          }
        : undefined,
      sections: checklistDefinitionVersion.sections
        ? checklistDefinitionVersion.sections.map((section) =>
            this.formatChecklistSectionDefinition(section),
          )
        : undefined,
      createdBy: checklistDefinitionVersion.createdBy
        ? {
            id: checklistDefinitionVersion.createdBy.id,
            fname: checklistDefinitionVersion.createdBy.fname,
            lname: checklistDefinitionVersion.createdBy.lname,
          }
        : undefined,
      createdAt: checklistDefinitionVersion.createdAt,
      updatedAt: checklistDefinitionVersion.updatedAt,
      teams: checklistDefinitionVersion?.checklistDefinition?.teams?.map(
        (link) => ({
          id: link.team.id,
          name: link.team.name,
        }),
      ),
    };
  }

  // Audit Reports methods
  async createAuditReport(
    auditReportDto: CreateAuditReportDto,
    user: UserRequest,
    file?: Express.Multer.File,
  ): Promise<{ id: string }> {
    // Verify the audit instance exists and user has access
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id: auditReportDto.auditInstanceId },
    });

    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    // Upload file if provided
    let filePath: string | undefined;
    if (file) {
      try {
        filePath = await this.fileService.uploadFile(file);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        this.logger.error(error);
        throw new BadRequestException(auditHttpError('AUDIT_055'));
      }
    }

    const auditReport = this.auditReportRepository.create({
      ...auditReportDto,
      filePath: filePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: { id: user.id },
    });

    const savedReport = await this.auditReportRepository.save(auditReport);
    return { id: savedReport.id };
  }

  async findAuditReportsByInstance(
    auditInstanceId: string,
    user: UserRequest,
  ): Promise<AuditReportResponseDto[]> {
    // Verify the audit instance exists and user has access
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id: auditInstanceId },
    });

    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    const reports = await this.auditReportRepository.find({
      where: { auditInstanceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    return reports.map((report) => this.formatAuditReportResponse(report));
  }

  async findOneAuditReport(
    id: string,
    user: UserRequest,
  ): Promise<AuditReportResponseDto> {
    const report = await this.auditReportRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!report) {
      throw new NotFoundException(auditHttpError('AUDIT_056'));
    }

    return this.formatAuditReportResponse(report);
  }

  async updateAuditReport(
    id: string,
    auditReportDto: UpdateAuditReportDto,
    user: UserRequest,
  ): Promise<AuditReportResponseDto> {
    const existingReport = await this.auditReportRepository.findOne({
      where: { id },
    });

    if (!existingReport) {
      throw new NotFoundException(auditHttpError('AUDIT_056'));
    }

    Object.assign(existingReport, auditReportDto);
    existingReport.updatedAt = Date.now();

    await this.auditReportRepository.save(existingReport);
    return this.findOneAuditReport(id, user);
  }

  async deleteAuditReport(id: string, user: UserRequest): Promise<void> {
    const existingReport = await this.auditReportRepository.findOne({
      where: { id },
    });

    if (!existingReport) {
      throw new NotFoundException(auditHttpError('AUDIT_056'));
    }

    await this.auditReportRepository.remove(existingReport);
  }

  private formatAuditReportResponse(
    report: AuditReport,
  ): AuditReportResponseDto {
    return {
      id: report.id,
      auditInstanceId: report.auditInstanceId,
      filePath: report.filePath,
      type: report.type,
      title: report.title,
      description: report.description,
      notes: report.notes,
      originalDate: report.originalDate,
      createdBy: {
        id: report.createdBy.id,
        fname: report.createdBy.fname,
        lname: report.createdBy.lname,
      },
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  async findAuditInstanceAttachments(
    auditInstanceId: string,
  ): Promise<AuditInstanceAttachmentResponseDto[]> {
    await this.requireAuditInstance(auditInstanceId);
    const attachments = await this.auditInstanceAttachmentRepository.find({
      where: { auditInstanceId },
      relations: ['file', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
    return attachments.map((attachment) =>
      this.formatAuditInstanceAttachment(attachment),
    );
  }

  async createAuditInstanceAttachment(
    auditInstanceId: string,
    user: UserRequest,
    file?: Express.Multer.File,
    fileId?: string,
  ): Promise<AuditInstanceAttachmentResponseDto> {
    const storedId = String(fileId || "").trim();
    if (!file && !storedId) {
      throw new BadRequestException(auditHttpError('AUDIT_083'));
    }

    const auditInstance = await this.requireAuditInstance(auditInstanceId);
    this.assertAttachmentsEditable(auditInstance.status);

    let storedFile = storedId
      ? await this.fileRepository.findOne({ where: { id: storedId } })
      : null;
    if (storedId && !storedFile) {
      throw new BadRequestException(auditHttpError('AUDIT_084'));
    }
    if (!storedFile) {
      let fileUrl: string;
      try {
        fileUrl = await this.fileService.uploadFile(file);
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        this.logger.error(error);
        throw new BadRequestException(auditHttpError('AUDIT_080'));
      }
      storedFile = await this.fileRepository.findOne({ where: { fileUrl } });
      if (!storedFile) {
        throw new BadRequestException(auditHttpError('AUDIT_080'));
      }
    }

    const createdBy = await this.userRepository.findOne({
      where: { id: user.id },
    });
    const attachment = await this.auditInstanceAttachmentRepository.save(
      this.auditInstanceAttachmentRepository.create({
        auditInstance: { id: auditInstance.id },
        auditInstanceId: auditInstance.id,
        file: storedFile,
        fileId: storedFile.id,
        createdBy: { id: user.id },
        createdByUserId: user.id,
        createdAt: Date.now(),
      }),
    );
    attachment.file = storedFile;
    if (createdBy) {
      attachment.createdBy = createdBy;
    }
    return this.formatAuditInstanceAttachment(attachment);
  }

  async deleteAuditInstanceAttachment(
    auditInstanceId: string,
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.auditInstanceAttachmentRepository.findOne({
      where: { id: attachmentId, auditInstanceId },
      relations: ['file', 'auditInstance'],
    });
    if (!attachment) {
      throw new NotFoundException(auditHttpError('AUDIT_081'));
    }
    this.assertAttachmentsEditable(attachment.auditInstance.status);

    const storedFile = attachment.file;
    await this.auditInstanceAttachmentRepository.remove(attachment);
    if (!storedFile) {
      return;
    }
    try {
      await this.fileService.deleteFile(storedFile.fileUrl);
    } catch (error) {
      this.logger.error(error);
    }
    await this.fileRepository.remove(storedFile);
  }

  private async requireAuditInstance(id: string): Promise<AuditInstance> {
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id },
    });
    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }
    return auditInstance;
  }

  private assertAttachmentsEditable(status: AuditInstanceStatus) {
    if (
      status !== AuditInstanceStatus.IN_PROGRESS &&
      status !== AuditInstanceStatus.DRAFT
    ) {
      throw new BadRequestException(auditHttpError('AUDIT_082'));
    }
  }

  private formatAuditInstanceAttachment(
    attachment: AuditInstanceAttachment,
  ): AuditInstanceAttachmentResponseDto {
    return {
      id: attachment.id,
      auditInstanceId: attachment.auditInstanceId,
      fileName: attachment.file?.fileName || '',
      filePath: attachment.file?.fileUrl || '',
      createdAt: attachment.createdAt,
      createdBy: attachment.createdBy
        ? {
            id: attachment.createdBy.id,
            fname: attachment.createdBy.fname,
            lname: attachment.createdBy.lname,
          }
        : undefined,
    };
  }

  // AuditChecklistResponse CRUD methods
  async deleteAuditChecklistResponse(
    id: string,
    user: UserRequest,
  ): Promise<void> {
    try {
      const existingResponse =
        await this.auditChecklistResponseRepository.findOne({
          where: { id },
        });

      if (!existingResponse) {
        throw new NotFoundException(auditHttpError('AUDIT_039'));
      }

      await this.auditChecklistResponseRepository.remove(existingResponse);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new BadRequestException(auditHttpError('AUDIT_057'));
    }
  }

  async getAuditChecklistResponsesGrouped(
    auditInstanceId: string,
    user: UserRequest,
  ): Promise<{
    auditInstance: {
      id: string;
      status: string;
      location?: string;
      auditProgram: { id: string; title: string };
    };
    checklists: Array<{
      checklistDefinition: { id: string; title: string; version: string };
      sections: any[];
      totalQuestions: number;
      answeredQuestions: number;
      completionPercentage: number;
    }>;
  }> {
    // Load instance with assigned checklist versions and responses
    const auditInstance = await this.auditInstanceRepository.findOne({
      where: { id: auditInstanceId },
      relations: [
        'auditProgram',
        'checklistVersions',
        'checklistVersions.checklistDefinitionVersion',
        'checklistVersions.checklistDefinitionVersion.checklistDefinition',
        'checklistVersions.checklistDefinitionVersion.sections',
        'checklistVersions.checklistDefinitionVersion.sections.questions',
        'checklistVersions.checklistDefinitionVersion.sections.subsections',
        'checklistVersions.checklistDefinitionVersion.sections.subsections.questions',
        'auditChecklistResponses',
        'auditChecklistResponses.questionDefinition',
        'auditChecklistResponses.respondedByTeamMember',
        'auditChecklistResponses.respondedByTeamMember.auditPersonnel',
        'auditChecklistResponses.respondedByTeamMember.auditRole',
        'auditChecklistResponses.auditFindings',
        'auditChecklistResponses.auditFindings.auditFindingEvidences',
        'auditChecklistResponses.auditFindings.nonConformity',
      ],
    });

    if (!auditInstance) {
      throw new NotFoundException(auditHttpError('AUDIT_030'));
    }

    const responseMap = new Map<string, any>();
    (auditInstance.auditChecklistResponses || []).forEach((r: any) => {
      responseMap.set(r.questionDefinition?.id, r);
    });

    const buildSection = (section: any) => {
      const questions = (section.questions || [])
        .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((q: any) => {
          const resp = responseMap.get(q.id);
          return {
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            reference: q.reference,
            guidanceNotes: q.guidanceNotes,
            orderIndex: q.orderIndex,
            response: resp
              ? {
                  id: resp.id,
                  responseAnswer: resp.responseAnswer,
                  auditorObservation: resp.auditorObservation,
                  respondedByTeamMember: resp.respondedByTeamMember
                    ? {
                        id: resp.respondedByTeamMember.id,
                        auditPersonnel: resp.respondedByTeamMember
                          .auditPersonnel
                          ? {
                              id: resp.respondedByTeamMember.auditPersonnel.id,
                              firstName:
                                resp.respondedByTeamMember.auditPersonnel
                                  .firstName,
                              lastName:
                                resp.respondedByTeamMember.auditPersonnel
                                  .lastName,
                            }
                          : undefined,
                        auditRole: resp.respondedByTeamMember.auditRole
                          ? {
                              id: resp.respondedByTeamMember.auditRole.id,
                              name: resp.respondedByTeamMember.auditRole.name,
                            }
                          : undefined,
                      }
                    : undefined,
                  respondedAt: resp.respondedAt,
                  auditFindings: (resp.auditFindings || []).map((f: any) => ({
                    id: f.id,
                    title: f.title,
                    description: f.description,
                    classification: f.classification,
                    createdAt: f.createdAt,
                    evidenceCount: (f.auditFindingEvidences || []).length,
                    raisedNc: f.raisedNc,
                    linkedNcId: f.nonConformity?.id || null,
                    ncName: f.nonConformity?.name || null,
                    evidences: (f.auditFindingEvidences || []).map(
                      (e: any) => ({
                        id: e.id,
                        description: e.description,
                        evidenceType: e.evidenceType,
                        documentId: e.documentId,
                        documentName: e.documentName,
                        fileName: e.evidenceFileUrl,
                      }),
                    ),
                  })),
                }
              : undefined,
          };
        });
      const answered = questions.filter((q: any) => q.response).length;
      return {
        id: section.id,
        title: section.title,
        orderIndex: section.orderIndex,
        questions,
        sectionCompletion: {
          totalQuestions: questions.length,
          answeredQuestions: answered,
          completionPercentage:
            questions.length > 0
              ? Math.round((answered / questions.length) * 100)
              : 0,
        },
        subsections: (section.subsections || [])
          .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
          .map(buildSection),
      };
    };

    const checklists = (auditInstance.checklistVersions || []).map(
      (cv: any) => {
        const cdv = cv.checklistDefinitionVersion;
        const sections = (cdv.sections || [])
          .filter((s: any) => !s.parentSectionId)
          .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
          .map(buildSection);

        const totalQuestions = (cdv.sections || []).reduce(
          (sum: number, s: any) =>
            sum +
            ((s.questions || []).length || 0) +
            (s.subsections || []).reduce(
              (ss: number, sub: any) =>
                ss + ((sub.questions || []).length || 0),
              0,
            ),
          0,
        );
        const answeredQuestions = sections.reduce(
          (sum: number, s: any) =>
            sum +
            s.sectionCompletion.answeredQuestions +
            (s.subsections || []).reduce(
              (ss: number, sub: any) =>
                ss + sub.sectionCompletion.answeredQuestions,
              0,
            ),
          0,
        );

        return {
          checklistDefinition: {
            id: cdv.checklistDefinition.id,
            title: cdv.checklistDefinition.title,
            version: cdv.version,
          },
          sections,
          totalQuestions,
          answeredQuestions,
          completionPercentage:
            totalQuestions > 0
              ? Math.round((answeredQuestions / totalQuestions) * 100)
              : 0,
        };
      },
    );

    return {
      auditInstance: {
        id: auditInstance.id,
        status: auditInstance.status,
        location: auditInstance.location,
        auditProgram: {
          id: auditInstance.auditProgram.id,
          title: auditInstance.auditProgram.title,
        },
      },
      checklists,
    };
  }

  private formatAuditChecklistResponse(
    response: AuditChecklistResponse,
  ): AuditChecklistResponseDto {
    return {
      id: response.id,
      auditInstance: {
        id: response.auditInstance.id,
        status: response.auditInstance.status,
        location: response.auditInstance.location,
      },
      questionDefinition: {
        id: response.questionDefinition.id,
        questionText: response.questionDefinition.questionText,
        questionType: response.questionDefinition.questionType,
        reference: response.questionDefinition.reference,
        guidanceNotes: response.questionDefinition.guidanceNotes,
        orderIndex: response.questionDefinition.orderIndex,
        sectionDefinition: {
          id: response.questionDefinition.sectionDefinition.id,
          title: response.questionDefinition.sectionDefinition.title,
          orderIndex: response.questionDefinition.sectionDefinition.orderIndex,
        },
      },
      responseAnswer: response.responseAnswer,
      auditorObservation: response.auditorObservation,
      respondedByTeamMember: response.respondedByTeamMember
        ? {
            id: response.respondedByTeamMember.id,
            auditPersonnel: {
              id: response.respondedByTeamMember.auditPersonnel.id,
              firstName:
                response.respondedByTeamMember.auditPersonnel.firstName,
              lastName: response.respondedByTeamMember.auditPersonnel.lastName,
            },
            auditRole: {
              id: response.respondedByTeamMember.auditRole.id,
              name: response.respondedByTeamMember.auditRole.name,
            },
          }
        : undefined,
      respondedAt: response.respondedAt,
    };
  }

  async bulkCreateUpdateAuditChecklistResponses(
    bulkDto: BulkCreateUpdateAuditChecklistResponseDto,
    user: UserRequest,
    files?: any[],
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const queryRunner =
      this.auditFindingRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (typeof bulkDto.responses === 'string') {
        bulkDto.responses = JSON.parse(bulkDto.responses as any);
      }
      if (!Array.isArray(bulkDto.responses)) {
        throw new BadRequestException(auditHttpError('AUDIT_059'));
      }

      const auditInstance = await this.auditInstanceRepository.findOne({
        where: { id: bulkDto.auditInstanceId },
        relations: [
          'checklistVersions',
          'checklistVersions.checklistDefinitionVersion',
          'checklistVersions.checklistDefinitionVersion.sections',
          'checklistVersions.checklistDefinitionVersion.sections.questions',
          'checklistVersions.checklistDefinitionVersion.sections.subsections',
          'checklistVersions.checklistDefinitionVersion.sections.subsections.questions',
          'auditChecklistResponses',
          'auditChecklistResponses.questionDefinition',
          'auditChecklistResponses.respondedByTeamMember',
          'auditChecklistResponses.respondedByTeamMember.auditPersonnel',
          'auditChecklistResponses.respondedByTeamMember.auditRole',
        ],
      });

      if (!auditInstance) {
        throw new NotFoundException(auditHttpError('AUDIT_030'));
      }

      // Prevent updates when audit is ON_HOLD or COMPLETED
      if (
        auditInstance.status === AuditInstanceStatus.ON_HOLD ||
        auditInstance.status === AuditInstanceStatus.COMPLETED
      ) {
        throw new BadRequestException(auditHttpError('AUDIT_060'));
      }

      const validQuestionIds = new Set<string>();
      for (const cv of auditInstance.checklistVersions || []) {
        for (const section of cv.checklistDefinitionVersion?.sections || []) {
          (section.questions || []).forEach((q: any) =>
            validQuestionIds.add(q.id),
          );
          for (const sub of section.subsections || []) {
            (sub.questions || []).forEach((q: any) =>
              validQuestionIds.add(q.id),
            );
          }
        }
      }

      const existingResponseMap = new Map<string, any>();
      (auditInstance.auditChecklistResponses || []).forEach((response: any) => {
        existingResponseMap.set(response.questionDefinition.id, response);
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      let currentFileIndex = 0;

      for (const responseItem of bulkDto.responses as any[]) {
        if (!validQuestionIds.has(responseItem.questionDefinitionId)) {
          errors.push(
            `Question ${responseItem.questionDefinitionId} not found in checklist`,
          );
          continue;
        }
        if (
          !responseItem.responseAnswer &&
          !responseItem.auditorObservation &&
          !responseItem.finding
        ) {
          continue;
        }
        if (responseItem.respondedByTeamMemberId) {
          const teamMember = await this.auditInstanceRepository
            .createQueryBuilder('auditInstance')
            .leftJoinAndSelect('auditInstance.auditTeamMembers', 'teamMembers')
            .where('auditInstance.id = :auditInstanceId', {
              auditInstanceId: bulkDto.auditInstanceId,
            })
            .andWhere('teamMembers.id = :teamMemberId', {
              teamMemberId: responseItem.respondedByTeamMemberId,
            })
            .getOne();
          if (!teamMember) {
            errors.push(
              `Team member ${responseItem.respondedByTeamMemberId} not found in audit instance`,
            );
            continue;
          }
        }

        const existingResponse = existingResponseMap.get(
          responseItem.questionDefinitionId,
        );
        if (existingResponse) {
          existingResponse.responseAnswer = responseItem.responseAnswer;
          existingResponse.auditorObservation = responseItem.auditorObservation;
          existingResponse.respondedByTeamMember =
            responseItem.respondedByTeamMemberId
              ? ({ id: responseItem.respondedByTeamMemberId } as any)
              : undefined;
          existingResponse.respondedAt = Date.now();
          const savedResponse =
            await queryRunner.manager.save(existingResponse);
          updated++;
          if (responseItem.finding) {
            const findingResult = await this.createFindingForResponse(
              queryRunner,
              savedResponse,
              responseItem.finding,
              user,
              files,
              currentFileIndex,
            );
            currentFileIndex += findingResult.filesUsed;
            if (findingResult.action === 'skipped') skipped++;
          }
        } else {
          const newResponse = this.auditChecklistResponseRepository.create({
            auditInstance: { id: bulkDto.auditInstanceId },
            questionDefinition: { id: responseItem.questionDefinitionId },
            responseAnswer: responseItem.responseAnswer,
            auditorObservation: responseItem.auditorObservation,
            respondedByTeamMember: responseItem.respondedByTeamMemberId
              ? { id: responseItem.respondedByTeamMemberId }
              : undefined,
            respondedAt: Date.now(),
          });
          const savedResponse = await queryRunner.manager.save(newResponse);
          created++;
          if (responseItem.finding) {
            const findingResult = await this.createFindingForResponse(
              queryRunner,
              savedResponse,
              responseItem.finding,
              user,
              files,
              currentFileIndex,
            );
            currentFileIndex += findingResult.filesUsed;
            if (findingResult.action === 'skipped') skipped++;
          }
        }
      }

      if (typeof bulkDto.deletedFindings === 'string') {
        bulkDto.deletedFindings = JSON.parse(bulkDto.deletedFindings as any);
      }
      if (bulkDto.deletedFindings) {
        if (!Array.isArray(bulkDto.deletedFindings)) {
          throw new BadRequestException(auditHttpError('AUDIT_059'));
        }
        for (const findingId of bulkDto.deletedFindings as any[]) {
          await queryRunner.manager.query(
            `UPDATE non_conformities SET finding_id = NULL, audit_id = NULL WHERE finding_id = ?`,
            [findingId],
          );
          await queryRunner.manager.delete(AuditFindingEvidence, {
            auditFinding: { id: findingId },
          });
          await queryRunner.manager.delete(AuditFinding, { id: findingId });
        }
      }

      await queryRunner.commitTransaction();
      return { created, updated, skipped, errors };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        // Preserve specific error messages (e.g., validation or status guards)
        throw error;
      }
      this.logger.error(
        'Error in bulk create/update audit checklist responses',
        error,
      );
      throw new BadRequestException(auditHttpError('AUDIT_061'));
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Private helper to create a finding for a response during bulk operations.
   */
  private async createFindingForResponse(
    queryRunner: QueryRunner,
    response: AuditChecklistResponse,
    findingData: CreateAuditFindingDto,
    user: UserRequest,
    files?: any[],
    fileStartIndex?: number,
  ): Promise<{ filesUsed: number; action: 'created' | 'updated' | 'skipped' }> {
    // Parse evidences if they are strings (similar to createAuditFinding)
    if (Array.isArray(findingData.evidences)) {
      findingData.evidences = findingData.evidences.map((e) =>
        typeof e === 'string' ? JSON.parse(e) : e,
      );
    }

    // Check if audit finding title already exists
    const existingAuditFinding = findingData.id
      ? await this.auditFindingRepository.findOne({
          where: {
            id: findingData.id,
            auditInstance: { id: findingData.auditInstanceId } as AuditInstance,
          },
          relations: ['auditChecklistResponse'],
        })
      : null;

    if (existingAuditFinding) {
      // If the finding belongs to the same response, update it instead of creating duplicate
      if (existingAuditFinding.auditChecklistResponse?.id === response.id) {
        this.logger.log(
          `Updating existing finding: '${findingData.title}' for response ${response.id}`,
        );

        // Update the existing finding
        existingAuditFinding.description = findingData.description;
        existingAuditFinding.classification = findingData.classification;
        existingAuditFinding.auditTeamMember = findingData.auditTeamMemberId
          ? ({ id: findingData.auditTeamMemberId } as any)
          : null;

        const linkedNcId = this.resolvedLinkedNcId(findingData);
        if (linkedNcId) {
          await this.detachOtherFindingsFromNonConformity(
            queryRunner.manager,
            linkedNcId,
            existingAuditFinding.id,
          );
          existingAuditFinding.nonConformity = { id: linkedNcId } as any;
          existingAuditFinding.raisedNc = true;
        } else if (linkedNcId === null) {
          existingAuditFinding.nonConformity = null;
          existingAuditFinding.raisedNc = false;
        } else if (typeof (findingData as any).raisedNc !== 'undefined') {
          existingAuditFinding.raisedNc =
            (findingData as any).raisedNc === 'true'
              ? true
              : !!(findingData as any).raisedNc;
        }

        await queryRunner.manager.save(existingAuditFinding);
        if (linkedNcId !== undefined) {
          await this.syncNonConformityAuditLink(
            queryRunner.manager,
            existingAuditFinding.id,
            findingData.auditInstanceId,
            linkedNcId,
          );
        }

        // Remove existing evidences and create new ones
        await queryRunner.manager.delete(AuditFindingEvidence, {
          auditFinding: { id: existingAuditFinding.id },
        });

        // Create new evidences with files if provided
        let filesUsed = 0;
        if (findingData.evidences && findingData.evidences.length > 0) {
          const findingFiles = files
            ? files.slice(fileStartIndex || 0)
            : undefined;

          filesUsed = await this.createAuditFindingEvidencesAndCountFiles(
            findingData.evidences,
            findingFiles,
            user,
            queryRunner,
            existingAuditFinding.id,
          );

          this.logger.log(
            `Updated ${findingData.evidences.length} evidences for finding ${existingAuditFinding.id}, used ${filesUsed} files`,
          );
        }

        return { filesUsed, action: 'updated' };
      } else {
        // Finding exists for a different response - this is a true duplicate
        this.logger.log(
          `Skipping duplicate finding: '${findingData.title}' already exists for a different response in audit instance ${findingData.auditInstanceId}`,
        );
        await queryRunner.commitTransaction();
        return { filesUsed: 0, action: 'skipped' };
      }
    }

    const linkedNcId = this.resolvedLinkedNcId(findingData);
    if (linkedNcId) {
      await this.detachOtherFindingsFromNonConformity(
        queryRunner.manager,
        linkedNcId,
      );
    }

    // Create the audit finding
    const auditFinding = queryRunner.manager.create(AuditFinding, {
      title: findingData.title,
      description: findingData.description,
      classification: findingData.classification,
      auditInstance: { id: findingData.auditInstanceId } as AuditInstance,
      auditChecklistResponse: { id: response.id } as AuditChecklistResponse,
      auditTeamMember: findingData.auditTeamMemberId
        ? ({ id: findingData.auditTeamMemberId } as any)
        : null,
      raisedNc: linkedNcId
        ? true
        : linkedNcId === null
          ? false
          : (findingData as any).raisedNc === 'true' ||
            (findingData as any).raisedNc === true,
      nonConformity: linkedNcId
        ? ({ id: linkedNcId } as any)
        : null,
      createdAt: Date.now(),
    });

    const savedFinding = await queryRunner.manager.save(auditFinding);
    if (linkedNcId) {
      await this.syncNonConformityAuditLink(
        queryRunner.manager,
        savedFinding.id,
        findingData.auditInstanceId,
        linkedNcId,
      );
    }

    this.logger.log(
      `Created finding ${savedFinding.id} for response ${response.id}, title: ${savedFinding.title}`,
    );

    // Create evidences with files if provided
    let filesUsed = 0;
    if (findingData.evidences && findingData.evidences.length > 0) {
      // Get the files slice for this finding (starting from fileStartIndex)
      const findingFiles = files ? files.slice(fileStartIndex || 0) : undefined;

      filesUsed = await this.createAuditFindingEvidencesAndCountFiles(
        findingData.evidences,
        findingFiles,
        user,
        queryRunner,
        savedFinding.id,
      );

      this.logger.log(
        `Created ${findingData.evidences.length} evidences for finding ${savedFinding.id}, used ${filesUsed} files`,
      );
    }

    return { filesUsed, action: 'created' };
  }

  private async evidenceFileUrl(id: string): Promise<string | null> {
    const row = await this.fileRepository.findOne({ where: { id } });
    return row?.fileUrl ?? null;
  }

  /**
   * Private helper to create and save evidences for an audit finding.
   * Handles validation, file upload, and entity creation.
   */
  private async createAuditFindingEvidences(
    evidences: any[],
    files: any[] | undefined,
    user: UserRequest,
    queryRunner: any,
    auditFindingId: string,
  ): Promise<void> {
    if (!evidences || !Array.isArray(evidences)) return;
    let fileIndex = 0;
    for (const evidence of evidences) {
      // Validate document exists if document type evidence
      if (evidence.evidenceType === AuditFindingEvidenceType.DOCUMENT) {
        const document = await queryRunner.manager.findOne(Document, {
          where: { id: evidence.documentId },
        });
        if (!document) {
          throw new BadRequestException(auditHttpError('AUDIT_062'));
        }
      }
      let fileUrl = await storedEvidenceUrl(evidence, (id) => this.evidenceFileUrl(id));
      if (
        !fileUrl &&
        evidence.evidenceType === AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE
      ) {
        fileUrl = await this.fileService.uploadFile(files?.[fileIndex]);
        fileIndex++;
      }
      const auditFindingEvidence = queryRunner.manager.create(
        AuditFindingEvidence,
        {
          description: evidence.description,
          evidenceType: evidence.evidenceType,
          evidenceFileUrl: fileUrl || null,
          document: evidence.documentId
            ? ({ id: evidence.documentId } as Document)
            : null,
          auditFinding: { id: auditFindingId } as AuditFinding,
        },
      );
      await queryRunner.manager.save(auditFindingEvidence);
    }
  }

  /**
   * Private helper to create and save evidences for an audit finding, returning file count.
   * Similar to createAuditFindingEvidences but returns the number of files processed.
   */
  private async createAuditFindingEvidencesAndCountFiles(
    evidences: any[],
    files: any[] | undefined,
    user: UserRequest,
    queryRunner: any,
    auditFindingId: string,
  ): Promise<number> {
    if (!evidences || !Array.isArray(evidences)) return 0;
    this.logger.log(
      `Processing ${
        evidences.length
      } evidences for finding ${auditFindingId}, available files: ${
        files?.length || 0
      }`,
    );
    let fileIndex = 0;
    for (const evidence of evidences) {
      this.logger.log(
        `Processing evidence: ${evidence.description}, type: ${evidence.evidenceType}`,
      );
      // Validate document exists if document type evidence
      if (evidence.evidenceType === AuditFindingEvidenceType.DOCUMENT) {
        const document = await queryRunner.manager.findOne(Document, {
          where: { id: evidence.documentId },
        });
        if (!document) {
          throw new BadRequestException(auditHttpError('AUDIT_062'));
        }
      }
      let fileUrl = await storedEvidenceUrl(evidence, (id) => this.evidenceFileUrl(id));
      if (
        !fileUrl &&
        evidence.evidenceType === AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE
      ) {
        if (files && files[fileIndex]) {
          this.logger.log(
            `Uploading file ${fileIndex}: ${files[fileIndex].originalname} for evidence: ${evidence.description}`,
          );
          fileUrl = await this.fileService.uploadFile(files[fileIndex]);
          this.logger.log(`File uploaded successfully, URL: ${fileUrl}`);
          fileIndex++;
        } else {
          this.logger.warn(
            `No file available at index ${fileIndex} for AUDIT_EVIDENCE_FILE evidence: ${evidence.description}`,
          );
        }
      }
      const auditFindingEvidence = queryRunner.manager.create(
        AuditFindingEvidence,
        {
          description: evidence.description,
          evidenceType: evidence.evidenceType,
          evidenceFileUrl: fileUrl || null,
          document: evidence.documentId
            ? ({ id: evidence.documentId } as Document)
            : null,
          auditFinding: { id: auditFindingId } as AuditFinding,
        },
      );
      await queryRunner.manager.save(auditFindingEvidence);
    }
    return fileIndex; // Return the number of files consumed
  }
}
