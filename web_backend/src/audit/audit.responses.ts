import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditInstanceStatus } from './entities/audit-instance.entity';
import { AuditProgramStatus } from './entities/audit-program.entity';
import { AuditFindingClassification } from './entities/audit-finding.entity';
import {
  BulkCreateUpdateAuditChecklistResponseDto,
  CreateAuditFindingDto,
  CreateAuditReportDto,
  UpdateAuditFindingDto,
  AuditCreatedByResponseDto,
} from './dtos';

export class AuditIdResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
}

export class ChecklistDefinitionSavedResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  version: string;
}

export class BulkChecklistResultResponseDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;

  @ApiProperty()
  skipped: number;

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class AuditPersonnelRecordResponseDto {
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

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  userId?: string | null;

  @ApiPropertyOptional({
    type: () => AuditCreatedByResponseDto,
    nullable: true,
  })
  user?: AuditCreatedByResponseDto | null;

  @ApiPropertyOptional({ type: () => AuditCreatedByResponseDto })
  createdBy?: AuditCreatedByResponseDto;

  @ApiProperty()
  deleted: boolean;
}

export class PaginatedAuditPersonnelResponseDto {
  @ApiProperty({ type: () => [AuditPersonnelRecordResponseDto] })
  data: AuditPersonnelRecordResponseDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  perPage: number;
}

export class CreateAuditFindingBodyDto extends CreateAuditFindingDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Files for evidences uploaded with this finding.',
  })
  files?: string[];
}

export class UpdateAuditFindingBodyDto extends UpdateAuditFindingDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Files for evidences uploaded with this finding.',
  })
  files?: string[];
}

export class CreateAuditReportBodyDto extends CreateAuditReportDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  file?: string;
}

export class CreateAuditInstanceAttachmentBodyDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: string;
}

export class BulkChecklistResponseBodyDto extends BulkCreateUpdateAuditChecklistResponseDto {
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Files for findings included in the checklist answers.',
  })
  files?: string[];
}

export class AuditSearchQueryDto {
  @ApiPropertyOptional({ description: 'Matches the record name.' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AuditPersonnelQueryDto {
  @ApiPropertyOptional({ description: 'Matches the person name or email.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Internal returns people linked to a user. Any other value returns external people.',
    example: 'Internal',
  })
  @IsOptional()
  @IsString()
  isExternal?: string;

  @ApiPropertyOptional({
    description:
      'Active returns active people. Any other value returns inactive people.',
    example: 'Active',
  })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({
    minimum: 1,
    description: 'Page number, starting at 1.',
    required: true,
  })
  @IsNumber()
  page: number;

  @ApiProperty({
    minimum: 1,
    description: 'Number of people per page.',  
    required: true, 
  })
  @IsNumber()
  perPage: number;
}

export class AuditProgramQueryDto {
  @ApiPropertyOptional({ enum: AuditProgramStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'When true, programs in DRAFT are omitted.',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  excludeDraft?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  auditActivityTypeId?: string;

  @ApiPropertyOptional({ description: 'Matches the program title.' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ChecklistDefinitionQueryDto {
  @ApiPropertyOptional({ description: 'Matches the checklist title.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Limits the list to published checklists for this program activity type.',
  })
  @IsOptional()
  @IsString()
  auditProgramId?: string;
}

export class ChecklistDefinitionVersionQueryDto {
  @ApiPropertyOptional({
    description: 'Checklist version to load. Omit to load the latest version.',
  })
  @IsOptional()
  @IsString()
  version?: string;
}

export class AuditInstanceQueryDto {
  @ApiPropertyOptional({
    description: 'When set, draft instances and draft programs are omitted.',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  excludeDraft?: string;

  @ApiPropertyOptional({ enum: AuditInstanceStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  auditProgramId?: string;

  @ApiPropertyOptional({ description: 'Matches the instance criteria.' })
  @IsOptional()
  @IsString()
  criteria?: string;

  @ApiPropertyOptional({ description: 'Matches the instance location.' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Matches the audit id.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Column to sort by. startDate is supported.',
    example: 'startDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc';
}

export class AuditFindingQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Audit instance whose findings are listed.',
  })
  @IsOptional()
  @IsString()
  auditInstanceId?: string;

  @ApiPropertyOptional({ enum: AuditFindingClassification })
  @IsOptional()
  @IsString()
  classification?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  teamMemberId?: string;

  @ApiPropertyOptional({
    description:
      'When true, only findings that raised a nonconformity are returned.',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  raisedNc?: string;

  @ApiPropertyOptional({ description: 'Matches the finding title.' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class GroupedChecklistProgramDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;
}

export class GroupedChecklistInstanceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty({ type: () => GroupedChecklistProgramDto })
  auditProgram: GroupedChecklistProgramDto;
}

export class GroupedChecklistDefinitionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  version: string;
}

export class GroupedChecklistPersonnelDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class GroupedChecklistRoleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class GroupedChecklistResponderDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ type: () => GroupedChecklistPersonnelDto })
  auditPersonnel?: GroupedChecklistPersonnelDto;

  @ApiPropertyOptional({ type: () => GroupedChecklistRoleDto })
  auditRole?: GroupedChecklistRoleDto;
}

export class GroupedChecklistEvidenceDto {
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

export class GroupedChecklistFindingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  classification: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  evidenceCount: number;

  @ApiProperty()
  raisedNc: boolean;

  @ApiProperty({ nullable: true })
  linkedNcId: string | null;

  @ApiProperty({ nullable: true })
  ncName: string | null;

  @ApiProperty({ type: () => [GroupedChecklistEvidenceDto] })
  evidences: GroupedChecklistEvidenceDto[];
}

export class GroupedChecklistAnswerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional()
  responseAnswer?: string;

  @ApiPropertyOptional()
  auditorObservation?: string;

  @ApiPropertyOptional({ type: () => GroupedChecklistResponderDto })
  respondedByTeamMember?: GroupedChecklistResponderDto;

  @ApiPropertyOptional()
  respondedAt?: number;

  @ApiProperty({ type: () => [GroupedChecklistFindingDto] })
  auditFindings: GroupedChecklistFindingDto[];
}

export class GroupedChecklistQuestionDto {
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

  @ApiPropertyOptional({ type: () => GroupedChecklistAnswerDto })
  response?: GroupedChecklistAnswerDto;
}

export class GroupedSectionCompletionDto {
  @ApiProperty()
  totalQuestions: number;

  @ApiProperty()
  answeredQuestions: number;

  @ApiProperty()
  completionPercentage: number;
}

export class GroupedChecklistSectionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty({ type: () => [GroupedChecklistQuestionDto] })
  questions: GroupedChecklistQuestionDto[];

  @ApiProperty({ type: () => GroupedSectionCompletionDto })
  sectionCompletion: GroupedSectionCompletionDto;

  @ApiPropertyOptional({ type: () => [GroupedChecklistSectionDto] })
  subsections?: GroupedChecklistSectionDto[];
}

export class GroupedChecklistDto {
  @ApiProperty({ type: () => GroupedChecklistDefinitionDto })
  checklistDefinition: GroupedChecklistDefinitionDto;

  @ApiProperty({ type: () => [GroupedChecklistSectionDto] })
  sections: GroupedChecklistSectionDto[];

  @ApiProperty()
  totalQuestions: number;

  @ApiProperty()
  answeredQuestions: number;

  @ApiProperty()
  completionPercentage: number;
}

export class GroupedAuditChecklistResponseDto {
  @ApiProperty({ type: () => GroupedChecklistInstanceDto })
  auditInstance: GroupedChecklistInstanceDto;

  @ApiProperty({ type: () => [GroupedChecklistDto] })
  checklists: GroupedChecklistDto[];
}
