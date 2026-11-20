import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditProgramStatus } from './entities/audit-program.entity';
import { AuditInstanceStatus } from './entities/audit-instance.entity';
import { AuditFindingClassification } from './entities/audit-finding.entity';
import { AuditFindingEvidenceType } from './entities/audit-finding-evidence.entity';
import { AuditReportType } from './entities/audit-report.entity';

export class AuditActivityTypeDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsBoolean()
  isDefault: boolean;
}

export class StandardDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  isDefault?: boolean;
}

export class AddStandardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddAuditActivityTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;
}

export class UpdateAuditActivityTypeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;
}

export class AuditPersonnelDto {
  @ApiPropertyOptional({
    description: 'Required when isExternal is true.',
  })
  @ValidateIf((o) => o.isExternal === true)
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Required when isExternal is true.',
  })
  @ValidateIf((o) => o.isExternal === true)
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({
    format: 'email',
    description: 'Required when isExternal is true.',
  })
  @ValidateIf((o) => o.isExternal === true)
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when the person is an internal user.',
  })
  @ValidateIf((o) => o.isExternal !== true)
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiPropertyOptional({
    description: 'True for a person who is not a system user.',
  })
  @IsBoolean()
  @IsOptional()
  isExternal?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
export class CreateAuditRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateAuditRoleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class AuditCreatedByResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;

  @ApiPropertyOptional({ format: 'email' })
  email?: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class AuditRoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiPropertyOptional()
  deleted?: boolean;

  @ApiProperty({ type: () => AuditCreatedByResponseDto })
  createdBy: AuditCreatedByResponseDto;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class CreateAuditDocumentTypeDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;
}

export class UpdateAuditDocumentTypeDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;
}

export class AuditDocumentTypeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: () => AuditCreatedByResponseDto })
  createdBy: AuditCreatedByResponseDto;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class AuditUserNameDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;
}

export class AuditTeamRefDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class AuditNamedRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class ChecklistSectionDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  orderIndex: number;

  @ApiPropertyOptional({ type: () => [ChecklistQuestionDefinitionDto] })
  @IsArray()
  @IsOptional()
  @Type(() => ChecklistQuestionDefinitionDto)
  questions?: ChecklistQuestionDefinitionDto[];

  @ApiPropertyOptional({
    type: () => [ChecklistSectionDefinitionDto],
    description: 'Nested sections. Only one level is supported.',
  })
  @IsArray()
  @IsOptional()
  @Type(() => ChecklistSectionDefinitionDto)
  subsections?: ChecklistSectionDefinitionDto[]; // one-level only
}

export class ChecklistQuestionDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({ enum: ['Yes/No/NA', 'Text Input'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Yes/No/NA', 'Text Input'])
  questionType: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  guidanceNotes?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  orderIndex: number;
}

export class CreateChecklistDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  activityTypeId?: string;

  @ApiProperty({
    type: [Number],
    description: 'Team ids that own this checklist.',
  })
  @IsArray()
  @IsNotEmpty()
  teamIds?: number[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @ApiPropertyOptional({ type: () => [ChecklistSectionDefinitionDto] })
  @IsArray()
  @IsOptional()
  @Type(() => ChecklistSectionDefinitionDto)
  sections?: ChecklistSectionDefinitionDto[];
}

export class UpdateChecklistDefinitionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  activityTypeId?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Team ids that own this checklist.',
  })
  @IsArray()
  @IsOptional()
  teamIds?: number[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @ApiPropertyOptional({ type: () => [ChecklistSectionDefinitionDto] })
  @IsArray()
  @IsOptional()
  @Type(() => ChecklistSectionDefinitionDto)
  sections?: ChecklistSectionDefinitionDto[];
}

export class ChecklistDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  version: string;

  @ApiPropertyOptional()
  isDraft?: boolean;

  @ApiPropertyOptional({ type: () => AuditNamedRefDto })
  activityType?: AuditNamedRefDto;

  @ApiPropertyOptional({ type: () => AuditUserNameDto })
  createdBy?: AuditUserNameDto;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiPropertyOptional({ type: () => [ChecklistSectionDefinitionResponseDto] })
  sections?: ChecklistSectionDefinitionResponseDto[];

  @ApiPropertyOptional({ type: () => [AuditTeamRefDto] })
  teams?: AuditTeamRefDto[];
}

export class CreateChecklistSectionDefinitionDto {
  @IsString()
  @IsNotEmpty()
  checklistDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  orderIndex: number;
}

export class UpdateChecklistSectionDefinitionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class ChecklistSectionDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty({ type: () => [ChecklistQuestionDefinitionResponseDto] })
  questions: ChecklistQuestionDefinitionResponseDto[];

  @ApiPropertyOptional({ type: () => [ChecklistSectionDefinitionResponseDto] })
  subsections?: ChecklistSectionDefinitionResponseDto[];

  @ApiPropertyOptional({ type: () => AuditUserNameDto })
  createdBy?: AuditUserNameDto;
}

export class CreateChecklistQuestionDefinitionDto {
  @IsString()
  @IsNotEmpty()
  sectionDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsString()
  @IsNotEmpty()
  questionType: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  guidanceNotes?: string;

  @IsNumber()
  orderIndex: number;
}

export class UpdateChecklistQuestionDefinitionDto {
  @IsString()
  @IsOptional()
  questionText?: string;

  @IsString()
  @IsOptional()
  questionType?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  guidanceNotes?: string;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class ChecklistQuestionDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  questionType: string;

  @ApiPropertyOptional()
  reference?: string;

  @ApiPropertyOptional()
  guidanceNotes?: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional({ type: () => AuditUserNameDto })
  createdBy?: AuditUserNameDto;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class AuditProgramInstanceSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  startDate?: number;

  @ApiPropertyOptional()
  endDate?: number;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional()
  objective?: string;

  @ApiPropertyOptional()
  criteria?: string;
}

export class AuditScheduleInstanceRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  auditId?: string;

  @ApiPropertyOptional()
  startDate?: number;

  @ApiPropertyOptional()
  endDate?: number;

  @ApiPropertyOptional({ enum: AuditInstanceStatus })
  status?: AuditInstanceStatus;
}

export class AuditProgramDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional()
  objective?: string;

  @ApiPropertyOptional({ description: 'Program start as Unix milliseconds.' })
  startDate?: number;

  @ApiProperty({ enum: AuditProgramStatus })
  status: AuditProgramStatus;

  @ApiPropertyOptional({ description: 'Program length in years.' })
  duration?: number;

  @ApiPropertyOptional({ type: () => [AuditNamedRefDto] })
  standards?: AuditNamedRefDto[];

  @ApiPropertyOptional({ type: () => AuditNamedRefDto })
  auditActivityType?: AuditNamedRefDto;

  @ApiPropertyOptional({ type: () => [AuditProgramInstanceSummaryDto] })
  auditInstances?: AuditProgramInstanceSummaryDto[];

  @ApiPropertyOptional({ type: () => [AuditProgramScheduleEntryDto] })
  scheduleEntries?: AuditProgramScheduleEntryDto[];
}

export class AuditProgramScheduleEntryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiProperty()
  year: number;

  @ApiProperty({ minimum: 1, maximum: 12 })
  month: number;

  @ApiProperty()
  process: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  isUnplanned?: boolean;

  @ApiPropertyOptional()
  amendmentReason?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  auditInstanceId?: string;

  @ApiPropertyOptional({ type: () => AuditScheduleInstanceRefDto })
  auditInstance?: AuditScheduleInstanceRefDto;
}
export class CreateAuditInstanceInProgramDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Present when updating an instance that already exists on the program.',
  })
  @IsString()
  @IsOptional()
  id?: string; // For existing instances to update

  @ApiPropertyOptional({ description: 'Start time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  startDate?: number;

  @ApiPropertyOptional({ description: 'End time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  endDate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  scheduleEntryId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isUnplanned?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unplannedProcess?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  amendmentReason?: string;
}

export class CreateAuditProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objective?: string;
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  auditActivityTypeId: string;
  @ApiProperty({ enum: AuditProgramStatus })
  @IsEnum(AuditProgramStatus)
  @IsNotEmpty()
  status: AuditProgramStatus;
  @ApiPropertyOptional({ type: () => [CreateAuditInstanceInProgramDto] })
  @IsArray()
  @IsOptional()
  instances?: CreateAuditInstanceInProgramDto[];

  @ApiPropertyOptional({ description: 'Program start as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  startDate?: number;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  standardIds?: string[];

  @ApiPropertyOptional({ description: 'Program length in years.' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ type: () => [AuditProgramScheduleEntryDto] })
  @IsArray()
  @IsOptional()
  scheduleEntries?: AuditProgramScheduleEntryDto[];
}
export class UpdateAuditProgramDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  auditActivityTypeId: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objective: string;
  @ApiPropertyOptional({ enum: AuditProgramStatus })
  @IsEnum(AuditProgramStatus)
  @IsOptional()
  status: AuditProgramStatus;
  @ApiPropertyOptional({ type: () => [CreateAuditInstanceInProgramDto] })
  @IsArray()
  @IsOptional()
  instances?: CreateAuditInstanceInProgramDto[];

  @ApiPropertyOptional({ description: 'Program start as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  startDate?: number;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  standardIds?: string[];

  @ApiPropertyOptional({ description: 'Program length in years.' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ type: () => [AuditProgramScheduleEntryDto] })
  @IsArray()
  @IsOptional()
  scheduleEntries?: AuditProgramScheduleEntryDto[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  instanceIdsToDelete?: string[];
}

export class CreateAuditProgramScheduleEntryDto {
  @ApiProperty({ description: 'Calendar year of the schedule slot.' })
  @IsNumber()
  @IsNotEmpty()
  year: number;

  @ApiProperty({
    minimum: 1,
    maximum: 12,
    description: 'Month number from 1 to 12.',
  })
  @IsNumber()
  @IsNotEmpty()
  month: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  process: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Required when the entry is added or moved outside the original plan.',
  })
  @IsString()
  @IsOptional()
  amendmentReason?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  auditInstanceId?: string;
}

export class AuditTeamMemberPersonnelDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  fname?: string;

  @ApiPropertyOptional()
  lname?: string;

  @ApiPropertyOptional({ format: 'email' })
  email?: string;
}

export class AuditTeamMemberRoleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  name?: string;
}

export class AuditTeamMemberDTO {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Existing team-member id. Omit when adding a member.',
  })
  id?: string;

  @ApiProperty({ type: () => AuditTeamMemberPersonnelDto })
  auditPersonnel: AuditTeamMemberPersonnelDto;

  @ApiProperty({ type: () => AuditTeamMemberRoleDto })
  auditRole: AuditTeamMemberRoleDto;
}

export class CreateAuditInstanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  auditProgramId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auditDocumentId?: string;

  @ApiPropertyOptional({ description: 'Start time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  startDate?: number;

  @ApiPropertyOptional({ description: 'End time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  endDate?: number;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  checklistDefinitionIds?: string[];

  @ApiPropertyOptional({ enum: AuditInstanceStatus })
  @IsEnum(AuditInstanceStatus)
  @IsOptional()
  status?: AuditInstanceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional({ type: () => [AuditTeamMemberDTO] })
  @IsArray()
  @IsOptional()
  teamMembers?: AuditTeamMemberDTO[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  scheduleEntryId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isUnplanned?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unplannedProcess?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  amendmentReason?: string;
}

export class UpdateAuditInstanceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  auditProgramId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auditDocumentId?: string;

  @ApiPropertyOptional({ description: 'Start time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  startDate?: number;

  @ApiPropertyOptional({ description: 'End time as Unix milliseconds.' })
  @IsNumber()
  @IsOptional()
  endDate?: number;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  assignedChecklistDefinitionIds?: string[];

  @ApiPropertyOptional({ enum: AuditInstanceStatus })
  @IsEnum(AuditInstanceStatus)
  @IsOptional()
  status?: AuditInstanceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auditSummary?: string;

  @ApiPropertyOptional({ type: () => [AuditTeamMemberDTO] })
  @IsArray()
  @IsOptional()
  teamMembers?: AuditTeamMemberDTO[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  scheduleEntryId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isUnplanned?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unplannedProcess?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  amendmentReason?: string;
}

export class AuditInstanceProgramSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: () => AuditNamedRefDto })
  auditActivityType?: AuditNamedRefDto;
}

export class AuditInstanceProgramDetailDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  objective?: string;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional({ type: () => AuditNamedRefDto })
  auditActivityType?: AuditNamedRefDto;
}

export class AuditChecklistTitleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;
}

export class AllAuditInstanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  startDate?: number;

  @ApiPropertyOptional()
  endDate?: number;

  @ApiProperty({ enum: AuditInstanceStatus })
  status: AuditInstanceStatus;

  @ApiProperty({ type: () => AuditUserNameDto })
  scheduledBy: AuditUserNameDto;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  auditId?: string;

  @ApiProperty({ type: () => AuditInstanceProgramSummaryDto })
  auditProgram: AuditInstanceProgramSummaryDto;

  @ApiPropertyOptional()
  criteria?: string;
}

export class AuditInstanceChecklistSectionRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional({ type: () => AuditChecklistTitleDto })
  checklistDefinition?: AuditChecklistTitleDto;
}

export class AuditInstanceQuestionRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  orderIndex: number;

  @ApiPropertyOptional({ type: () => AuditInstanceChecklistSectionRefDto })
  sectionDefinition?: AuditInstanceChecklistSectionRefDto;
}

export class AuditFindingNonConformityRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  problemStatement?: string;

  @ApiPropertyOptional()
  dueDate?: number;
}

export class AuditInstanceFindingEvidenceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  evidenceType?: string;

  @ApiPropertyOptional()
  documentId?: string;

  @ApiPropertyOptional()
  documentName?: string;

  @ApiPropertyOptional()
  fileName?: string;
}

export class AuditInstanceFindingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  classification?: string;

  @ApiProperty()
  raisedNc: boolean;

  @ApiPropertyOptional({ type: () => AuditFindingNonConformityRefDto })
  nonConformity?: AuditFindingNonConformityRefDto;

  @ApiPropertyOptional({ type: () => [AuditInstanceFindingEvidenceDto] })
  auditFindingEvidences?: AuditInstanceFindingEvidenceDto[];
}

export class AuditInstanceChecklistAnswerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  responseAnswer?: string;

  @ApiPropertyOptional()
  auditorObservation?: string;

  @ApiPropertyOptional({ type: () => AuditInstanceQuestionRefDto })
  questionDefinition?: AuditInstanceQuestionRefDto;

  @ApiPropertyOptional({ type: () => [AuditInstanceFindingDto] })
  auditFindings?: AuditInstanceFindingDto[];
}

export class AuditInstanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  auditId?: string;

  @ApiProperty({ type: () => AuditInstanceProgramDetailDto })
  auditProgram: AuditInstanceProgramDetailDto;

  @ApiPropertyOptional()
  auditDocumentId?: string;

  @ApiPropertyOptional()
  startDate?: number;

  @ApiPropertyOptional()
  endDate?: number;

  @ApiPropertyOptional({ type: () => [AuditChecklistTitleDto] })
  ChecklistDefinitions?: AuditChecklistTitleDto[];

  @ApiProperty({ enum: AuditInstanceStatus })
  status: AuditInstanceStatus;

  @ApiProperty({ type: () => AuditUserNameDto })
  scheduledBy: AuditUserNameDto;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional()
  objective?: string;

  @ApiPropertyOptional()
  criteria?: string;

  @ApiPropertyOptional()
  auditSummary?: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty({ type: () => [AuditTeamMemberDTO] })
  teamMembers: AuditTeamMemberDTO[];

  @ApiPropertyOptional({ type: () => AuditProgramScheduleEntryDto })
  scheduleEntry?: AuditProgramScheduleEntryDto;

  @ApiPropertyOptional({ type: () => [AuditInstanceChecklistAnswerDto] })
  auditChecklistResponses?: AuditInstanceChecklistAnswerDto[];
}

export class CreateAuditReportDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Set from the instance id in the URL when creating a report.',
  })
  @IsString()
  @IsOptional()
  auditInstanceId?: string;

  @ApiProperty({ enum: AuditReportType })
  @IsEnum(AuditReportType)
  @IsNotEmpty()
  type: AuditReportType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Original report date as Unix milliseconds.',
  })
  @IsNumber()
  @IsOptional()
  originalDate?: number;
}

export class CreateAuditFindingEvidences {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({ enum: AuditFindingEvidenceType })
  @IsEnum(AuditFindingEvidenceType)
  @IsNotEmpty()
  evidenceType: AuditFindingEvidenceType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when evidenceType is DOCUMENT.',
  })
  @IsString()
  @IsOptional()
  documentId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'A file already stored by a connection. Use this for AUDIT_EVIDENCE_FILE instead of a multipart file.',
  })
  @IsString()
  @IsOptional()
  fileId?: string;
}

export class UpdateAuditFindingDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  auditInstanceId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({ enum: AuditFindingClassification })
  @IsEnum(AuditFindingClassification)
  @IsOptional()
  classification: AuditFindingClassification;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  linkedNcId?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  deleteEvidenceIds: string[];

  @ApiPropertyOptional({ type: () => [CreateAuditFindingEvidences] })
  @IsArray()
  @IsOptional()
  evidences: CreateAuditFindingEvidences[];

  @ApiPropertyOptional({
    description: 'Send "true" to raise a nonconformity from this finding.',
  })
  @IsString()
  @IsOptional()
  raisedNc?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsString()
  @IsOptional()
  auditTeamMemberId?: string | null = null;
}
export class UpdateAuditReportDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Original report date as Unix milliseconds.',
  })
  @IsNumber()
  @IsOptional()
  originalDate?: number;

  @ApiPropertyOptional({ enum: AuditReportType })
  @IsEnum(AuditReportType)
  @IsOptional()
  type?: AuditReportType;
}

export class AuditReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  auditInstanceId: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty({ enum: AuditReportType })
  type: AuditReportType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  originalDate?: number;

  @ApiPropertyOptional({ type: () => AuditUserNameDto })
  createdBy?: AuditUserNameDto;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class AuditInstanceAttachmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  auditInstanceId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({
    description: 'Stored file key used to download the attachment.',
  })
  filePath: string;

  @ApiPropertyOptional({ type: () => AuditUserNameDto })
  createdBy?: AuditUserNameDto;

  @ApiProperty()
  createdAt: number;
}

export class ChangeAuditInstanceStatusDto {
  @ApiProperty({ enum: AuditInstanceStatus })
  @IsEnum(AuditInstanceStatus)
  @IsNotEmpty()
  status: AuditInstanceStatus;
}
// Audit Checklist Response DTOs
export class CreateAuditChecklistResponseDto {
  @IsString()
  @IsNotEmpty()
  auditInstanceId: string;

  @IsString()
  @IsNotEmpty()
  questionDefinitionId: string;

  @IsString()
  @IsOptional()
  responseAnswer?: string;

  @IsString()
  @IsOptional()
  auditorObservation?: string;

  @IsString()
  @IsOptional()
  respondedByTeamMemberId?: string;
}

export class UpdateAuditChecklistResponseDto {
  @IsString()
  @IsOptional()
  responseAnswer?: string;

  @IsString()
  @IsOptional()
  auditorObservation?: string;

  @IsString()
  @IsOptional()
  respondedByTeamMemberId?: string;
}
export class BulkCreateUpdateAuditChecklistResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  auditInstanceId: string;

  @ApiProperty({
    type: () => [BulkAuditChecklistResponseItemDto],
    description:
      'Answers to save. In a multipart request, send this field as a JSON string of the same array.',
  })
  @IsNotEmpty()
  responses: BulkAuditChecklistResponseItemDto[] | string; // Allow string for FormData parsing

  @ApiPropertyOptional({
    description:
      'Finding ids to delete. In a multipart request, send this field as a JSON string array.',
  })
  @IsNotEmpty()
  deletedFindings?: string;
}

export class AuditChecklistResponseDto {
  id: string;
  auditInstance: {
    id: string;
    status: string;
    location?: string;
  };
  questionDefinition: {
    id: string;
    questionText: string;
    questionType: string;
    reference?: string;
    guidanceNotes?: string;
    orderIndex: number;
    sectionDefinition: {
      id: string;
      title: string;
      orderIndex: number;
    };
  };
  responseAnswer?: string;
  auditorObservation?: string;
  respondedByTeamMember?: {
    id: string;
    auditPersonnel: {
      id: string;
      firstName: string;
      lastName: string;
    };
    auditRole: {
      id: string;
      name: string;
    };
  };
  respondedAt?: number;
}

export class AuditChecklistResponsesGroupedDto {
  auditInstance: {
    id: string;
    status: string;
    location?: string;
    auditProgram: {
      id: string;
      title: string;
    };
  };
  checklistDefinition: {
    id: string;
    title: string;
    version: string;
  };
  sections: AuditChecklistSectionResponseDto[];
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
}

export class AuditChecklistSectionResponseDto {
  id: string;
  title: string;
  orderIndex: number;
  questions: AuditChecklistQuestionResponseDto[];
  subsections?: AuditChecklistSectionResponseDto[];
  sectionCompletion: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
}

export class AuditChecklistQuestionResponseDto {
  id: string;
  questionText: string;
  questionType: string;
  reference?: string;
  guidanceNotes?: string;
  orderIndex: number;
  response?: {
    id: string;
    responseAnswer?: string;
    auditorObservation?: string;
    respondedByTeamMember?: {
      id: string;
      auditPersonnel: {
        id: string;
        firstName: string;
        lastName: string;
      };
      auditRole: {
        id: string;
        name: string;
      };
    };
    respondedAt?: number;
    auditFindings?: {
      id: string;
      title: string;
      description: string;
      classification: string;
      severity?: string;
      createdAt: number;
      evidenceCount: number;
    }[];
  };
}

export class CreateAuditFindingDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  auditInstanceId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  auditChecklistResponseId: string;

  /** When set, finding is attached to checklist question (creates response if needed). */
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Attaches the finding to this checklist question, creating the answer when needed.',
  })
  @IsString()
  @IsOptional()
  questionDefinitionId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsString()
  @IsOptional()
  auditTeamMemberId?: string | null = null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: AuditFindingClassification })
  @IsEnum(AuditFindingClassification)
  @IsNotEmpty()
  classification: AuditFindingClassification;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  linkedNcId?: string;

  @ApiPropertyOptional({ type: () => [CreateAuditFindingEvidences] })
  @IsArray()
  @IsOptional()
  evidences: CreateAuditFindingEvidences[];

  @ApiPropertyOptional({
    description: 'Send "true" to raise a nonconformity from this finding.',
  })
  @IsString()
  @IsOptional()
  raisedNc?: string;
}

export class BulkAuditChecklistResponseItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  @IsNotEmpty()
  questionDefinitionId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  responseAnswer?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  auditorObservation?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  respondedByTeamMemberId?: string;

  @ApiPropertyOptional({ type: () => CreateAuditFindingDto })
  @IsOptional()
  finding?: CreateAuditFindingDto;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsArray()
  @IsOptional()
  deletedFindings?: string[];
}

export class AuditFindingTeamMemberDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ nullable: true })
  fname: string | null;

  @ApiProperty({ nullable: true })
  lname: string | null;
}

export class AuditFindingNonConformityDto {
  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  problemStatement?: string;

  @ApiPropertyOptional()
  dueDate?: number;
}

export class AuditFindingResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  questionText: string | null;

  @ApiProperty({ enum: AuditFindingClassification })
  classification: AuditFindingClassification;

  @ApiProperty()
  numberOfEvidences: number;

  @ApiProperty({ type: () => AuditFindingTeamMemberDto, nullable: true })
  auditTeamMember: AuditFindingTeamMemberDto | null;

  @ApiPropertyOptional()
  raisedNc?: boolean;

  @ApiPropertyOptional({
    type: () => AuditFindingNonConformityDto,
    nullable: true,
  })
  nonConformity?: AuditFindingNonConformityDto | null;

  @ApiPropertyOptional({ type: [String] })
  evidences?: string[];

  @ApiPropertyOptional({ nullable: true })
  recommendations?: string | null;
}

export class AuditFindingEvidenceDetailDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  documentName: string | null;

  @ApiProperty()
  evidenceType: string;

  @ApiProperty({ nullable: true })
  documentId: string | null;

  @ApiProperty({ nullable: true })
  fileName: string | null;
}

export class AuditFindingDetailResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: AuditFindingClassification })
  classification: AuditFindingClassification;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  linkedNcId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  ncName?: string | null;

  @ApiProperty()
  raisedNc: boolean;

  @ApiProperty()
  createdAt: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Team member assigned to the finding, when one is set.',
  })
  auditTeamMember: any;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'Checklist answer this finding is attached to, when one is set.',
  })
  auditChecklistResponse: any;

  @ApiProperty({ type: () => [AuditFindingEvidenceDetailDto] })
  evidences: AuditFindingEvidenceDetailDto[];
}
