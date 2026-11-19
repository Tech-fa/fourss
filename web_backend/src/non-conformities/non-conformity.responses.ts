import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseUserDTO } from '../user/user.dto';
import { ImmediateActionStatus } from '../common/immediate-action.entity';
import { ImmediateActionEvidenceType } from '../common/immediate-action-evidence-type';
import {
  ImmediateActionCommentResponse,
  ImmediateActionEvidenceResponse,
} from '../common/immediate-action-common.service';
import {
  CaChangeRequestStatus,
  CaChangeRequestType,
} from './entities/ca_change_request.entity';
import {
  NCCorrectiveActionPriority,
  NCCorrectiveActionStatus,
  NCCorrectiveActionSource,
} from './entities/nc-corrective-action.entity';
import { NCStatus } from './dtos';
import {
  CloseNonConformityDto,
  CreateInvestigationEvidenceDto,
  CreateNonConformityDto,
  FishboneCategoryDto,
  UpdateInvestigationEvidenceDto,
  UpdateNonConformityDto,
} from './dtos';

export class NonConformityIdResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
}

export class NonConformitySuccessResponseDto {
  @ApiProperty()
  success: boolean;
}

export class BulkRCAFiveWhyResultResponseDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;

  @ApiProperty()
  deleted: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class CreateNonConformityBodyDto extends CreateNonConformityDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Evidence files.',
  })
  files?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Files for file-upload custom fields. Order matches uuids.',
  })
  fieldFiles?: string[];
}

export class UpdateNonConformityBodyDto extends UpdateNonConformityDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Evidence files to add.',
  })
  files?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description:
      'Files for file-upload custom fields. Order matches uuids.',
  })
  fieldFiles?: string[];
}

export class CloseNonConformityBodyDto extends CloseNonConformityDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Evidence files to add when closing.',
  })
  files?: string[];
}

export class CreateInvestigationEvidenceBodyDto extends CreateInvestigationEvidenceDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: string;
}

export class UpdateInvestigationEvidenceBodyDto extends UpdateInvestigationEvidenceDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: string;
}

export class UploadFileBodyDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: string;
}

export class CategoryQueryDto {
  @ApiPropertyOptional({ description: 'Matches the category name.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Limits the list to children of this category.',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CustomFieldQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Matches the field label.' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class NCCustomFieldValueQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  ncId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  customFieldId?: string;
}

export class NameSearchQueryDto {
  @ApiPropertyOptional({ description: 'Matches the name.' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class RepresentativeQueryDto {
  @ApiPropertyOptional({ description: 'Matches the person name or email.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['internal', 'external'],
    description: 'Limits the list to internal users or external representatives.',
  })
  @IsOptional()
  @IsString()
  personnelType?: string;

  @ApiPropertyOptional({
    description: 'Team id. Limits internal people to this team.',
  })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated team ids. Limits internal people to these teams.',
  })
  @IsOptional()
  @IsString()
  teamIds?: string;
}

export class CorrectiveActionQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Nonconformity whose corrective actions are listed.',
  })
  @IsOptional()
  @IsString()
  nonConformityId?: string;

  @ApiPropertyOptional({ description: 'Matches the corrective action title.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: NCCorrectiveActionPriority })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ enum: NCCorrectiveActionStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Limits the list to one assignee.',
  })
  @IsOptional()
  @IsString()
  assignee?: string;
}

export class ChangeRequestQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Corrective action whose change requests are listed.',
  })
  @IsOptional()
  @IsString()
  caId?: string;

  @ApiPropertyOptional({ description: 'Matches the change request reason.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CaChangeRequestStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: CaChangeRequestType })
  @IsOptional()
  @IsString()
  type?: string;
}

export class NonConformityQueryDto {
  @ApiPropertyOptional({
    description: 'When true, only nonconformities with no audit finding are returned.',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  unlinked?: string;

  @ApiPropertyOptional({
    enum: ['OPEN', 'CLOSED', 'OVERDUE'],
    description:
      'OPEN is open and not overdue. OVERDUE is open and past the due date.',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  nonConformityTypeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  nonConformityRiskLevelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Matches the name or problem statement.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['dueDate', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDir?: string;
}

export class ImmediateActionQueryDto {
  @ApiPropertyOptional({ enum: ImmediateActionStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'One status, or several statuses.',
    enum: ImmediateActionStatus,
    isArray: true,
  })
  @IsOptional()
  statuses?: string | string[];

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  assigned_to_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  created_by_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiPropertyOptional({
    description: 'Limits the list to actions created in the last N days.',
  })
  @IsOptional()
  @IsString()
  created_in_last_days?: string;

  @ApiPropertyOptional({ description: 'Matches the description.' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class NonConformityListTeamDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class NonConformityListNameDto {
  @ApiPropertyOptional()
  name?: string;
}

export class NonConformityListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  dueDate: number;

  @ApiProperty()
  problemStatement: string;

  @ApiProperty({ enum: NCStatus })
  status: NCStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  responsibleUserId?: string | null;

  @ApiProperty()
  isOverdue: boolean;

  @ApiPropertyOptional({ type: () => NonConformityListTeamDto })
  team?: NonConformityListTeamDto;

  @ApiPropertyOptional({ type: () => NonConformityListNameDto })
  nonConformityRiskLevel?: NonConformityListNameDto;

  @ApiPropertyOptional({ type: () => NonConformityListNameDto })
  nonConformityType?: NonConformityListNameDto;

  @ApiPropertyOptional({ type: () => NonConformityListNameDto })
  category?: NonConformityListNameDto;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  createdBy?: BaseUserDTO;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  responsibleUser?: BaseUserDTO;
}

export class CaEffectivenessEvidenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  caId: string;

  @ApiProperty()
  fileUrl: string;

  @ApiPropertyOptional({ format: 'uuid' })
  uploadedById?: string;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  uploadedBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  uploadedAt?: number;
}

export class CorrectiveActionCauseRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  text: string;
}

export class CorrectiveActionFiveWhyRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  whyQuestion?: string;

  @ApiPropertyOptional()
  becauseAnswer?: string;
}

export class CorrectiveActionCauseLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  rcaCauseId?: string | null;

  @ApiPropertyOptional({ type: () => CorrectiveActionCauseRefDto })
  rcaCause?: CorrectiveActionCauseRefDto;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  rcaFiveWhyStepId?: string | null;

  @ApiPropertyOptional({ type: () => CorrectiveActionFiveWhyRefDto })
  rcaFiveWhyStep?: CorrectiveActionFiveWhyRefDto;
}

export class CaChangeRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  caId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: CaChangeRequestType })
  type: CaChangeRequestType;

  @ApiProperty()
  reason: string;

  @ApiProperty({ enum: CaChangeRequestStatus })
  status: CaChangeRequestStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  requestedById?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Unix time in milliseconds.',
  })
  newDueDate?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  newAssigneeId?: string | null;

  @ApiPropertyOptional({ type: () => BaseUserDTO, nullable: true })
  newAssignee?: BaseUserDTO | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  reviewedById?: string | null;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  reviewedBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  reviewedAt?: number;
}

export class NCCorrectiveActionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  expectedOutcome?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  nonConformityId?: string;

  @ApiProperty({ enum: NCCorrectiveActionPriority })
  priority: NCCorrectiveActionPriority;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  dueDate: number;

  @ApiPropertyOptional({ format: 'uuid' })
  assignedToId?: string;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  assignedTo?: BaseUserDTO;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  verifiedById?: string | null;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  verifiedBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  verifiedAt?: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  closedAt?: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  appliedAt?: number;

  @ApiPropertyOptional()
  rejectionExplanation?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  createdById?: string;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  createdBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  createdAt?: number;

  @ApiProperty({ enum: NCCorrectiveActionStatus })
  status: NCCorrectiveActionStatus;

  @ApiPropertyOptional({ enum: NCCorrectiveActionSource })
  source?: NCCorrectiveActionSource;

  @ApiPropertyOptional({ type: () => [CaChangeRequestResponseDto] })
  changeRequests?: CaChangeRequestResponseDto[];

  @ApiPropertyOptional({ type: () => [CaEffectivenessEvidenceResponseDto] })
  effectivenessEvidences?: CaEffectivenessEvidenceResponseDto[];

  @ApiPropertyOptional({ type: () => [CorrectiveActionCauseLinkResponseDto] })
  ncCorrectiveActionCauses?: CorrectiveActionCauseLinkResponseDto[];
}

export class RCAFishboneRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  rootCauseAnalysisId: string;

  @ApiPropertyOptional({ nullable: true })
  effectStatement?: string | null;

  @ApiPropertyOptional({ type: () => [FishboneCategoryDto] })
  categories?: FishboneCategoryDto[];

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  createdAt: number;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  updatedAt: number;
}

export class ImmediateActionRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  parentEntityId?: string;

  @ApiPropertyOptional({ enum: ['nc'] })
  parentType?: 'nc';

  @ApiProperty()
  description: string;

  @ApiProperty({ type: () => BaseUserDTO })
  assignedTo: BaseUserDTO;

  @ApiProperty({ type: () => BaseUserDTO })
  createdBy: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  dueDate?: number;

  @ApiProperty({ enum: ImmediateActionStatus })
  status: ImmediateActionStatus;

  @ApiProperty({ enum: ImmediateActionEvidenceType })
  evidenceType: ImmediateActionEvidenceType;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  verifiedBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  verifiedAt?: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  closedAt?: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  appliedAt?: number;

  @ApiPropertyOptional()
  rejectionExplanation?: string;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  createdAt: number;

  @ApiProperty({ type: () => [ImmediateActionEvidenceResponse] })
  evidences: ImmediateActionEvidenceResponse[];

  @ApiProperty({ type: () => [ImmediateActionCommentResponse] })
  comments: ImmediateActionCommentResponse[];
}
