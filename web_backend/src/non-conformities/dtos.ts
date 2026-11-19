import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ImmediateActionStatus } from '../common/immediate-action.entity';
import { BaseUserDTO } from '../user/user.dto';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from './entities/category-custom-field.entity';
import {
  NCCorrectiveActionPriority,
  NCCorrectiveActionStatus,
} from './entities/nc-corrective-action.entity';
import {
  CaChangeRequestStatus,
  CaChangeRequestType,
} from './entities/ca_change_request.entity';
import { InvestigationAction } from './entities/investigation.entity';

// Category DTOs
export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ format: 'uuid' })
  parentId?: string;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  createdBy?: BaseUserDTO;

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  parent?: CategoryResponseDto;

  @ApiPropertyOptional({ type: () => [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({ type: () => [CategoryCustomFieldResponseDto] })
  customFields?: CategoryCustomFieldResponseDto[];
}

// CategoryCustomField DTOs
export class CreateCategoryCustomFieldDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  @IsNotEmpty()
  fieldType: CustomFieldType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = false;

  @ApiPropertyOptional({
    description: 'JSON string of dropdown or multi-select options.',
  })
  @IsString()
  @IsOptional()
  options?: string;

  @ApiPropertyOptional({
    description: 'JSON string of accepted file extensions for a file field.',
  })
  @IsString()
  @IsOptional()
  acceptedFiles?: string;
}

export class CreateCategoryCustomFieldWithoutCategoryIdDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  @IsNotEmpty()
  fieldType: CustomFieldType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = false;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  acceptedFiles?: string[];
}

export class UpdateCategoryCustomFieldDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  @IsOptional()
  fieldType?: CustomFieldType;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  acceptedFiles?: string[];
}

export class CategoryCustomFieldResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  categoryId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: CustomFieldType })
  fieldType: CustomFieldType;

  @ApiProperty()
  isRequired: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Parsed option list, or null when the field has none.',
  })
  options?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Parsed accepted file types, or null when the field has none.',
  })
  acceptedFiles?: string;

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  category?: CategoryResponseDto;
}

// NCCustomFieldValue DTOs
export class CreateNCCustomFieldValueDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  ncId: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  customFieldId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  value?: string;
}

export class UpdateNCCustomFieldValueDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  ncId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  customFieldId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  value?: string;
}

export class NCCustomFieldValueResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  customFieldId: string;

  @ApiPropertyOptional()
  value?: string;

  @ApiPropertyOptional({ type: () => CategoryCustomFieldResponseDto })
  customField?: CategoryCustomFieldResponseDto;
}

// Bulk operations DTOs
export class CreateCategoryWithCustomFieldsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    type: () => [CreateCategoryCustomFieldWithoutCategoryIdDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryCustomFieldWithoutCategoryIdDto)
  customFields?: CreateCategoryCustomFieldWithoutCategoryIdDto[];
}

export class UpdateCategoryWithCustomFieldsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    type: () => [CreateCategoryCustomFieldWithoutCategoryIdDto],
    description: 'Replaces the category custom fields when sent.',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryCustomFieldWithoutCategoryIdDto)
  customFields?: CreateCategoryCustomFieldWithoutCategoryIdDto[];
}

export class CustomFieldValueDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  ncId: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  customFieldId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  value?: string;
}

export class CreateNonConformityTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;
}

export class UpdateNonConformityTypeDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;
}

export class NonConformityTypeResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string;
}

export class CreateNonConformityRiskLevelDto extends CreateNonConformityTypeDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Send an existing id to update that risk level.',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'Display order. Lower numbers come first.' })
  @IsNumber()
  @IsOptional()
  order: number;
}

export class UpdateNonConformityRiskLevelDto extends UpdateNonConformityTypeDto {
  @ApiPropertyOptional({ description: 'Display order. Lower numbers come first.' })
  @IsNumber()
  @IsOptional()
  order: number;
}

export class NonConformityRiskLevelResponseDTO extends NonConformityTypeResponseDTO {
  @ApiProperty()
  order: number;
}

export class BulkCreateNonConformityRiskLevelDto {
  @ApiProperty({ type: () => [CreateNonConformityRiskLevelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNonConformityRiskLevelDto)
  riskLevels: CreateNonConformityRiskLevelDto[];
}

export enum NCStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class CreateNonConformityDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  teamId: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  representativeId?: string;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'EXTERNAL'] })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @IsIn(['INTERNAL', 'EXTERNAL'])
  representativeType?: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  nonConformityRiskLevelId: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  nonConformityTypeId: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Date reported.' })
  @IsString()
  @IsNotEmpty()
  dateReported: string;

  @ApiProperty({ description: 'Due date.' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  problemStatement: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objectiveEvidence: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requirements: string;

  @ApiPropertyOptional({
    type: 'string',
    description:
      'JSON array of { customFieldId, value }. On a multipart request this is a JSON string.',
  })
  @IsOptional()
  customFieldValues?: any;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Custom field ids, in the same order as fieldFiles, for file-upload fields.',
  })
  @IsArray()
  @IsOptional()
  uuids?: string[];

  @ApiPropertyOptional({
    description: 'true when an investigation is required.',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  needsInvestigation?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  responsibleUserId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Audit instance this non-conformity is raised from. The stored audit id is copied from that audit.',
  })
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  auditInstanceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Audit finding this non-conformity is assigned to.',
  })
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  findingId?: string;
}

export class UpdateNonConformityDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  teamId: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  representativeId?: string | null;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'EXTERNAL'] })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @IsIn(['INTERNAL', 'EXTERNAL'])
  representativeType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  nonConformityRiskLevelId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  nonConformityTypeId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  categoryId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dateReported: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dueDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  problemStatement: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objectiveEvidence: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  requirements: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Evidence file names to remove.',
  })
  @IsArray()
  @IsOptional()
  removedFiles: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Custom field ids, in the same order as fieldFiles, for file-upload fields.',
  })
  @IsArray()
  @IsOptional()
  uuids?: string[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'JSON array of { customFieldId, value }. On a multipart request this is a JSON string.',
  })
  @IsOptional()
  customFieldValues?: any;

  @ApiPropertyOptional({ enum: NCStatus })
  @IsOptional()
  @IsEnum(NCStatus)
  status?: NCStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  closingComment?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  needsInvestigation?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? null : value))
  responsibleUserId?: string | null;
}

/** Body for PUT `/non-conformities/:id/close` (the NC id is taken from the URL). */
export class CloseNonConformityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  closingComment?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  needsInvestigation?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Evidence file names to remove.',
  })
  @IsArray()
  @IsOptional()
  removedFiles?: string[];
}

export class AmendNonConformityDueDateDto {
  @ApiProperty({ description: 'New due date.' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;
}

export class NcDueDateAmendmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  previousDueDate: number;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  newDueDate: number;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  amendedAt: number;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  amendedBy?: BaseUserDTO;
}

export class NcTeamSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class NcNameRefDto {
  @ApiPropertyOptional()
  name?: string;
}

export class NcRepresentativeRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ format: 'email' })
  email: string;
}

export class NcCustomFieldSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  label?: string;

  @ApiPropertyOptional()
  fieldType?: string;

  @ApiPropertyOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  options?: any;

  @ApiPropertyOptional()
  acceptedFiles?: any;
}

export class NcCustomFieldValueSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  value?: any;

  @ApiPropertyOptional({ type: () => NcCustomFieldSummaryDto })
  customField?: NcCustomFieldSummaryDto;
}

export class NcCorrectiveActionUserRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;
}

export class NcCorrectiveActionSummaryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: NCCorrectiveActionPriority })
  priority: string | number;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  dueDate: number;

  @ApiProperty({ type: () => NcCorrectiveActionUserRefDto })
  assignedTo: NcCorrectiveActionUserRefDto;

  @ApiProperty({ enum: NCCorrectiveActionStatus })
  status: string;
}

export class NcAuditInstanceSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true })
  auditId?: string | null;

  @ApiProperty({ format: 'uuid' })
  auditProgramId: string;
}

export class NcFindingSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: () => NcAuditInstanceSummaryDto, nullable: true })
  auditInstance?: NcAuditInstanceSummaryDto | null;
}

export class NonConformityResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  teamId: number;

  @ApiPropertyOptional({ type: () => NcTeamSummaryDto })
  team?: NcTeamSummaryDto;

  @ApiPropertyOptional({ format: 'uuid' })
  representativeId?: string;

  @ApiPropertyOptional({ enum: ['INTERNAL', 'EXTERNAL'] })
  representativeType?: string;

  @ApiPropertyOptional({ type: () => NcRepresentativeRefDto, nullable: true })
  representative?: NcRepresentativeRefDto | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  internalRepresentativeId?: string | null;

  @ApiProperty({ format: 'uuid' })
  nonConformityRiskLevelId: string;

  @ApiPropertyOptional({ type: () => NcNameRefDto })
  nonConformityRiskLevel?: NcNameRefDto;

  @ApiProperty({ format: 'uuid' })
  nonConformityTypeId: string;

  @ApiPropertyOptional({ type: () => NcNameRefDto })
  nonConformityType?: NcNameRefDto;

  @ApiProperty({ format: 'uuid' })
  categoryId: string;

  @ApiPropertyOptional({ type: () => NcNameRefDto })
  category?: NcNameRefDto;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  dateReported: number;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  dueDate: number;

  @ApiProperty()
  problemStatement: string;

  @ApiPropertyOptional()
  objectiveEvidence: string;

  @ApiPropertyOptional()
  requirements: string;

  @ApiProperty({ type: [String] })
  evidenceFiles: string[];

  @ApiProperty({ enum: NCStatus })
  status: NCStatus;

  @ApiPropertyOptional()
  isOverdue?: boolean;

  @ApiPropertyOptional({ type: () => [NcDueDateAmendmentResponseDto] })
  dueDateAmendments?: NcDueDateAmendmentResponseDto[];

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  createdBy?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  createdAt?: number;

  @ApiPropertyOptional({ type: () => [NcCustomFieldValueSummaryDto] })
  customFieldValues?: NcCustomFieldValueSummaryDto[];

  @ApiPropertyOptional({ type: () => [NcCorrectiveActionSummaryDto] })
  correctiveActions?: NcCorrectiveActionSummaryDto[];

  @ApiPropertyOptional()
  closingComment?: string;

  @ApiPropertyOptional()
  needsInvestigation?: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  responsibleUserId?: string | null;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  responsibleUser?: BaseUserDTO;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  internalRepresentative?: BaseUserDTO;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  findingId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Audit id copied from the audit when the finding is assigned.',
  })
  auditId?: string | null;

  @ApiPropertyOptional({ type: () => NcFindingSummaryDto, nullable: true })
  finding?: NcFindingSummaryDto | null;
}

export class CreateNonConformityRepresentativeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ format: 'email' })
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class NonConformityRepresentativeResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  isExternal: boolean;
}

export class UpdateNonConformityRepresentativeDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsString()
  @IsOptional()
  email: string;
}

export class CreateNCCorrectiveActionCausesDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  rcaCauseId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  rcaFiveWhyStepId: string;
}
export class CreateNCCorrectiveActionDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  nonConformityId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expectedOutcome: string;

  @ApiProperty({ enum: NCCorrectiveActionPriority })
  @IsEnum(NCCorrectiveActionPriority)
  @IsNotEmpty()
  priority: NCCorrectiveActionPriority;

  @ApiProperty({ description: 'Due date.' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  assignedToId: string;

  @ApiProperty({ type: () => [CreateNCCorrectiveActionCausesDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateNCCorrectiveActionCausesDto)
  ncCorrectiveActionCauses: CreateNCCorrectiveActionCausesDto[];
}

export class UpdateNCCorrectiveActionDto{
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ enum: NCCorrectiveActionStatus })
  @IsEnum(NCCorrectiveActionStatus)
  @IsOptional()
  status: NCCorrectiveActionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionExplanation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expectedOutcome: string;

  @ApiPropertyOptional({ enum: NCCorrectiveActionPriority })
  @IsEnum(NCCorrectiveActionPriority)
  @IsOptional()
  priority: NCCorrectiveActionPriority;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  dueDate: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  assignedToId: string;

  @ApiPropertyOptional({ type: () => [CreateNCCorrectiveActionCausesDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateNCCorrectiveActionCausesDto)
  ncCorrectiveActionCauses: CreateNCCorrectiveActionCausesDto[];
}

export class CreateCaChangeRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  caId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ enum: CaChangeRequestType })
  @IsEnum(CaChangeRequestType)
  @IsNotEmpty()
  type: CaChangeRequestType;

  @ApiPropertyOptional({
    description: 'Required when type is DUE_DATE_CHANGE.',
  })
  @IsString()
  @IsOptional()
  newDueDate: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when type is ASSIGNEE_CHANGE.',
  })
  @IsString()
  @IsOptional()
  newAssigneeId: string;
}

export class UpdateCaChangeRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ enum: CaChangeRequestStatus })
  @IsEnum(CaChangeRequestStatus)
  @IsOptional()
  status: CaChangeRequestStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  caId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason: string;

  @ApiPropertyOptional({ enum: CaChangeRequestType })
  @IsEnum(CaChangeRequestType)
  @IsOptional()
  type: CaChangeRequestType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  newDueDate: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  newAssigneeId: string;
}

// Immediate Action DTOs
export class CreateImmediateActionDto {

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  assigned_to_id: string;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsNumber()
  @IsOptional()
  due_date?: number;

  @ApiPropertyOptional({ enum: ImmediateActionStatus })
  @IsEnum(ImmediateActionStatus)
  @IsOptional()
  status?: ImmediateActionStatus;
}

export class UpdateImmediateActionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assigned_to_id?: string;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsNumber()
  @IsOptional()
  due_date?: number;

  @ApiPropertyOptional({ enum: ImmediateActionStatus })
  @IsEnum(ImmediateActionStatus)
  @IsOptional()
  status?: ImmediateActionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionExplanation?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  verified_by_id?: string;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsNumber()
  @IsOptional()
  verified_at?: number;
}



export class ImmediateActionParentRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  problemStatement: string;

  @ApiProperty()
  status: string;
}

export class ImmediateActionResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  nc_id: string;

  @ApiPropertyOptional({ type: () => ImmediateActionParentRefDto })
  nc?: ImmediateActionParentRefDto;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: () => BaseUserDTO })
  assigned_to: BaseUserDTO;

  @ApiProperty({ type: () => BaseUserDTO })
  created_by: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  due_date?: number;

  @ApiProperty({ enum: ImmediateActionStatus })
  status: ImmediateActionStatus;

  @ApiPropertyOptional({ type: () => BaseUserDTO })
  verified_by?: BaseUserDTO;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  verified_at?: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  appliedAt?: number;

  @ApiPropertyOptional()
  rejectionExplanation?: string;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  created_at: number;

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  closed_at?: number;
}

// Evidence DTOs
export class CreateEvidenceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  nc_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  uploaded_by_id: string;
}

export class EvidenceParentRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  nc_id: string;

  @ApiProperty()
  problemStatement: string;
}

export class EvidenceResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  nc_id: string;

  @ApiPropertyOptional({ type: () => EvidenceParentRefDto })
  nc?: EvidenceParentRefDto;

  @ApiProperty()
  file_url: string;

  @ApiProperty({ type: () => BaseUserDTO })
  uploaded_by: BaseUserDTO;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  uploaded_at: number;
}

// Immediate Action Evidence DTOs




// Root Cause Analysis DTOs
export class CreateRootCauseAnalysisDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  nc_id: string;

  @ApiProperty({
    description: 'Fishbone, CauseEffect, or FiveWhys.',
    example: 'FiveWhys',
  })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  performed_by_ids?: string[];

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsNumber()
  @IsOptional()
  performed_at?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  problem_statement: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRootCauseAnalysisDto {
  @ApiPropertyOptional({ example: 'FiveWhys' })
  @IsString()
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  performed_by_ids?: string[];

  @ApiPropertyOptional({ description: 'Unix time in milliseconds.' })
  @IsNumber()
  @IsOptional()
  performed_at?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  problem_statement?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
export class FishboneResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  rootCauseAnalysisId: string;

  @ApiProperty()
  effectStatement: string;

  @ApiProperty({ type: () => [FishboneCategoryDto] })
  categories: FishboneCategoryDto[];
}

export class RootCauseAnalysisParentRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  problemStatement: string;

  @ApiProperty()
  status: string;
}

export class RootCauseAnalysisResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  nc_id: string;

  @ApiPropertyOptional({ type: () => RootCauseAnalysisParentRefDto })
  nc?: RootCauseAnalysisParentRefDto;

  @ApiProperty()
  method: string;

  @ApiProperty({ type: () => [BaseUserDTO] })
  performed_by: BaseUserDTO[];

  @ApiProperty({ type: () => [RCAResponseDTO] })
  fiveWhySteps: RCAResponseDTO[];

  @ApiProperty({ nullable: true, description: 'Unix time in milliseconds.' })
  performed_at: number | null;

  @ApiProperty({ nullable: true })
  problem_statement: string | null;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  created_at: number;

  @ApiProperty({ type: () => [RCACeCategoryResponseDTO] })
  rcaCeCategories: RCACeCategoryResponseDTO[];

  @ApiPropertyOptional({ type: () => FishboneResponseDTO })
  rcaFishbone?: FishboneResponseDTO;
}

// Investigation DTOs
export class CreateInvestigationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  nc_id: string;

  @ApiProperty({ enum: InvestigationAction })
  @IsString()
  @IsNotEmpty()
  @IsEnum(InvestigationAction)
  action: InvestigationAction;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  root_ca_id?: string;
}

export class UpdateInvestigationDto {
  @ApiPropertyOptional({ enum: InvestigationAction })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  root_ca_id?: string;
}

export class InvestigationRootCauseRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  method: string;

  @ApiProperty({ nullable: true })
  problem_statement: string | null;
}

export class InvestigationResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  nc_id: string;

  @ApiPropertyOptional({ type: () => RootCauseAnalysisParentRefDto })
  nc?: RootCauseAnalysisParentRefDto;

  @ApiProperty({ enum: InvestigationAction, nullable: true })
  action: InvestigationAction | null;

  @ApiPropertyOptional({ type: () => InvestigationRootCauseRefDto })
  root_ca?: InvestigationRootCauseRefDto;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  created_at: number;
}

// Investigation Evidence DTOs
export class CreateInvestigationEvidenceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  investigation_id: string;
}

export class UpdateInvestigationEvidenceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  file_url?: string;
}

export class InvestigationEvidenceParentRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: InvestigationAction, nullable: true })
  action: InvestigationAction | null;

  @ApiProperty({ format: 'uuid' })
  nc_id: string;
}

export class InvestigationEvidenceResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  investigation_id: string;

  @ApiPropertyOptional({ type: () => InvestigationEvidenceParentRefDto })
  investigation?: InvestigationEvidenceParentRefDto;

  @ApiProperty()
  file_url: string;

  @ApiProperty({ type: () => BaseUserDTO })
  uploaded_by: BaseUserDTO;

  @ApiProperty({ description: 'Unix time in milliseconds.' })
  uploaded_at: number;
}

export class CreateRCAFiveWhyStepDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Send an existing id to update that step.',
  })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  stepNumber?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  whyQuestion: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  becauseAnswer: string;
}

export class RCAResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  rcaId: string;

  @ApiPropertyOptional()
  stepNumber?: number;

  @ApiProperty()
  whyQuestion: string;

  @ApiProperty()
  becauseAnswer: string;
}

export class BulkCreateRCAFiveWhyStepDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  rcaId: string;

  @ApiProperty({ type: () => [CreateRCAFiveWhyStepDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateRCAFiveWhyStepDto)
  steps: CreateRCAFiveWhyStepDto[];
}
export class CreateRCACeCauseDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class CreateRCACeCategoryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: () => [CreateRCACeCauseDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRCACeCauseDto)
  causes?: CreateRCACeCauseDto[];
}

export class BulkCreateRCACeCategoryDto {


  @ApiProperty({ type: () => [CreateRCACeCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRCACeCategoryDto)
  categories: CreateRCACeCategoryDto[];
}

export class RCACeCategoryResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: () => [RCACeCauseResponseDTO] })
  causes: RCACeCauseResponseDTO[];
}

export class RCACeCauseResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional({ type: () => [RCACeCauseResponseDTO] })
  children?: RCACeCauseResponseDTO[];
}

export class FishboneCauseDto {
  @ApiProperty()
  text: string;

  @ApiPropertyOptional({ type: () => [FishboneCauseDto] })
  children?: FishboneCauseDto[];
}

export class FishboneCategoryDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ type: () => [FishboneCauseDto] })
  causes: FishboneCauseDto[];
}

export class CreateFishboneDto {
    @ApiPropertyOptional()
    effectStatement?: string;

    @ApiPropertyOptional({ type: () => [FishboneCategoryDto] })
    categories?: FishboneCategoryDto[];
}

export class UpdateFishboneDto {
    @ApiPropertyOptional()
    effectStatement?: string;

    @ApiPropertyOptional({ type: () => [FishboneCategoryDto] })
    categories?: FishboneCategoryDto[];
}
