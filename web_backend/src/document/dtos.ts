import { Type, Transform } from "class-transformer";
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsObject,
  IsUUID,
  ArrayNotEmpty,
  MaxLength,
  IsIn,
  ArrayMaxSize,
  Min,
} from "class-validator";
import { DocumentActionType } from "./document-action.entity";
import { IdReferenceDTO } from "../common/pagination";
import { BaseUserDTO } from "../user/user.dto";
import { ChangeRequestStatus } from "./change-request.entity";
import { DocumentChecklistQuestionType } from "./document-checklist-question.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType, DocumentStatus } from "./document.enums";

export { ContentType, DocumentStatus } from "./document.enums";

function parseJsonField(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export class DocumentVersionDto {
  id: number;
  @IsString()
  @IsNotEmpty()
  file: string;

  versionNumber: number;

  @IsEnum(DocumentStatus)
  status: DocumentStatus;
}

export class DocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  dueDate?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentCode: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsNotEmpty()
  documentTypeId?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsNotEmpty()
  teamId?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isAiAccessible?: boolean;
}

/** JSON body for PUT /documents/:id — metadata only, no file upload. */
export class UpdateDocumentDto extends DocumentDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @Transform(({ value }) => parseJsonField(value))
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  processIds?: string[];
}
export class DocumentChecklistQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ enum: DocumentChecklistQuestionType })
  @IsEnum(DocumentChecklistQuestionType)
  @IsNotEmpty()
  questionType: DocumentChecklistQuestionType;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  required: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  orderIndex: number;
}

export class CreateDocumentChecklistDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [DocumentChecklistQuestionDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DocumentChecklistQuestionDto)
  questions: DocumentChecklistQuestionDto[];
}

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  dueDate?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentCode: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsNotEmpty()
  documentTypeId?: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  teamId: number;

  @ApiProperty({
    description:
      "true or false. Sent as text because this request is multipart.",
  })
  @IsString()
  @IsNotEmpty()
  isPublic: string;

  @ApiPropertyOptional({
    description:
      "true or false. Sent as text because this request is multipart.",
  })
  @IsString()
  @IsOptional()
  isAiAccessible?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changes?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  versionNumber?: number;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ format: "uuid" })
  @IsString()
  @IsOptional()
  documentTemplateId?: string;

  /** If set, the draft is deleted after the document is created (not linked). */
  @ApiPropertyOptional({
    format: "uuid",
    description: "If set, the draft is deleted after the document is created.",
  })
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @Transform(({ value }) => parseJsonField(value))
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  processIds?: string[];

  @ApiPropertyOptional({ type: CreateDocumentChecklistDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDocumentChecklistDto)
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  checklist?: CreateDocumentChecklistDto;
}

export class CreateDocumentVersionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dueDate?: number;

  /** If set, the draft is deleted after the new version is created. */
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "If set, the draft is deleted after the new version is created.",
  })
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

  @ApiPropertyOptional({ type: CreateDocumentChecklistDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDocumentChecklistDto)
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  checklist?: CreateDocumentChecklistDto;
}

/** Body for adding/replacing editor content on a pending version. Docx is sent as multipart field `file`. */
export class UploadVersionEditorContentDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changes?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;
}

/** Body for adding/replacing checklist content on a pending version. */
export class UploadVersionChecklistDto {
  @ApiProperty({ type: CreateDocumentChecklistDto })
  @ValidateNested()
  @Type(() => CreateDocumentChecklistDto)
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  checklist: CreateDocumentChecklistDto;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  changes?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;
}

export class AddDocumentContentContributorsDto {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  userIds: string[];
}

export class ViewDocumentDto extends DocumentDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DocumentVersionDto)
  versions: DocumentVersionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DocumentContributorDto)
  contributors: DocumentContributorDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseUserDTO)
  approvers: BaseUserDTO[];

  changeRequest: { id: number };

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseUserDTO)
  reviewers: BaseUserDTO[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseUserDTO)
  acknowledgers: BaseUserDTO[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseUserDTO)
  contentContributors?: BaseUserDTO[];

  team: { id: number; name: string };

  /** HTML content of the latest published version (EDITOR docs only, when requested). */
  @IsString()
  @IsOptional()
  latestPublishedVersionContent?: string;

  @IsString()
  @IsOptional()
  pendingVersionContent?: string;

  /** Present when the document was created from a template (id only). */
  @IsOptional()
  documentTemplate?: { id: string } | null;

  @IsArray()
  @IsOptional()
  processes?: { id: string; name: string; code: string | null }[];
}

export class DocumentTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string = "";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryCode: string;
}

export enum DocumentApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  REVIEWED = "reviewed",
}

export class ApprovalStrategyDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  requiredReviews: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  requiredApprovals: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Review time limit, in days." })
  @IsInt()
  @IsOptional()
  maxReviewDuration?: number;

  @ApiPropertyOptional({ description: "Approval time limit, in days." })
  @IsInt()
  @IsOptional()
  maxApprovalDuration?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allApprovers?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allReviewers?: boolean;

  @ApiPropertyOptional({ type: [IdReferenceDTO] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  teams?: IdReferenceDTO[];

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  documentTypeId?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  noReview?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  noApprove?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowOrdering?: boolean;
}

export class ApprovalStrategyParticipantDto {
  @ApiProperty({ oneOf: [{ type: "number" }, { type: "string" }] })
  @IsNotEmpty()
  id: number | string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}

export class ApprovalStrategyUserDto extends BaseUserDTO {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateApprovalStrategyDto extends ApprovalStrategyDto {
  @ApiPropertyOptional({ type: [ApprovalStrategyParticipantDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyParticipantDto)
  approvers: ApprovalStrategyParticipantDto[];

  @ApiPropertyOptional({ type: [ApprovalStrategyParticipantDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyParticipantDto)
  reviewers: ApprovalStrategyParticipantDto[];
}
export class ViewApprovalStrategyDto extends ApprovalStrategyDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional({ type: [ApprovalStrategyUserDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyUserDto)
  approvers: ApprovalStrategyUserDto[];

  @ApiPropertyOptional({ type: [ApprovalStrategyUserDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyUserDto)
  reviewers: ApprovalStrategyUserDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class DocumentAcknowledgementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allUsers?: boolean;

  @ApiPropertyOptional({ type: [IdReferenceDTO] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  teams?: IdReferenceDTO[];

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  documentTypeId?: number;
}

export class CreateDocumentAcknowledgementDto extends DocumentAcknowledgementDto {
  @ApiPropertyOptional({ type: [IdReferenceDTO] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  users: IdReferenceDTO[];
}

export class ViewDocumentAcknowledgementDto extends DocumentAcknowledgementDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional({ type: [BaseUserDTO] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BaseUserDTO)
  users: BaseUserDTO[];
}

export class DocumentApprovalDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @IsNotEmpty()
  documentId: string;

  @IsEnum(["approver", "reviewer"])
  roleType: "approver" | "reviewer";

  @IsEnum(DocumentApprovalStatus)
  @IsOptional()
  status?: DocumentApprovalStatus;
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ description: "Matches the title or document code." })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "title, documentCode, or createdAt." })
  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., 'title', 'documentCode', 'createdAt'

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsString()
  sortDir?: "asc" | "desc";

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Document category id." })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Team id." })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsString()
  processId?: string;
}

export class DocumentTemplateFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["true", "false"] })
  @IsOptional()
  @IsString()
  isDefault?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  searchTitleOnly?: boolean;
}

/** DTO for document template list items (templates tab + choose-template modal). */
export class DocumentTemplateDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: number;
}

export class CreateDocumentActionDto {
  @ApiProperty({ enum: DocumentActionType })
  type: DocumentActionType;

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  versionNumber?: number;
}

export class DocumentContributorDto {
  @IsString()
  @IsNotEmpty()
  user: BaseUserDTO;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DocumentActionDto)
  actions: DocumentActionDto[];

  @IsNumber()
  @IsNotEmpty()
  version: number;
}

export class DocumentActionDto {
  @IsString()
  @IsNotEmpty()
  actionType: DocumentActionType;

  @IsNumber()
  @IsNotEmpty()
  createdDate: number;

  @IsObject()
  @IsNotEmpty()
  comment: { text: string };
}

export class CreateChangeRequestDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  teamId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  risks?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @IsNotEmpty()
  documentIds: string[];
}

export class UpdateChangeRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  teamId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  risks?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReviewChangeRequestDto {
  @ApiProperty({ enum: ChangeRequestStatus })
  @IsEnum(ChangeRequestStatus)
  @IsNotEmpty()
  status: ChangeRequestStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reviewComment?: string;
}

export class TeamRefDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class ChangeRequestDocumentRefDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;
}

export class ChangeRequestDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  riskIdentified?: string;

  @ApiProperty({ enum: ChangeRequestStatus })
  @IsEnum(ChangeRequestStatus)
  status: ChangeRequestStatus;

  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  documentIds: string[];

  @ApiPropertyOptional({ type: TeamRefDto })
  @IsObject()
  @IsOptional()
  team?: TeamRefDto;

  @ApiProperty({ type: BaseUserDTO })
  @ValidateNested()
  @Type(() => BaseUserDTO)
  requestedBy: BaseUserDTO;

  @ApiPropertyOptional({ type: BaseUserDTO })
  @ValidateNested()
  @Type(() => BaseUserDTO)
  @IsOptional()
  reviewedBy?: BaseUserDTO;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  reviewedAt?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reviewComment?: string;

  @ApiProperty()
  @IsNumber()
  createdAt: number;

  @ApiProperty()
  @IsNumber()
  updatedAt: number;
}

export class ViewChangeRequestDto extends ChangeRequestDto {
  @ApiProperty({ type: [ChangeRequestDocumentRefDto] })
  documents: ChangeRequestDocumentRefDto[];
}

export class ChangeRequestFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ChangeRequestStatus })
  @IsOptional()
  @IsEnum(ChangeRequestStatus)
  status?: ChangeRequestStatus;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsString()
  documentId?: string;
}

export class CreateDocumentTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateDocumentDraftDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value == null || value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  documentVersionId?: number;
}

export class UpdateDocumentDraftDto {}

export class DocumentDraftFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class DocumentDraftCreatedByDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiPropertyOptional()
  fname?: string;

  @ApiPropertyOptional()
  lname?: string;
}

export class DocumentDraftDocumentRefDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;
}

export class DocumentDraftVersionRefDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  versionNumber: number;
}

export class DocumentDraftListItemDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true, format: "uuid" })
  documentId: string | null;

  @ApiProperty({ nullable: true })
  documentVersionId: number | null;

  @ApiPropertyOptional({ type: DocumentDraftDocumentRefDto, nullable: true })
  document?: DocumentDraftDocumentRefDto | null;

  @ApiPropertyOptional({ type: DocumentDraftVersionRefDto, nullable: true })
  documentVersion?: DocumentDraftVersionRefDto | null;

  @ApiPropertyOptional({ type: DocumentDraftCreatedByDto })
  createdBy?: DocumentDraftCreatedByDto;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  createdAt: number;
}

export class DocumentDraftDetailDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true, format: "uuid" })
  documentId: string | null;

  @ApiProperty({ nullable: true })
  documentVersionId: number | null;

  @ApiPropertyOptional({ type: DocumentDraftCreatedByDto })
  createdBy?: DocumentDraftCreatedByDto;

  /** Signed URL for draft docx content (SuperDoc). */
  @ApiPropertyOptional({ description: "Signed URL for the draft file." })
  contentUrl?: string;
}

export class AssistDocumentWriteMessageDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;
}

export class AssistDocumentWriteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  prompt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ type: [AssistDocumentWriteMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AssistDocumentWriteMessageDto)
  messages?: AssistDocumentWriteMessageDto[];

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  extraContext?: unknown;
}

export class DocumentWriteResponseDto {
  @ApiProperty()
  model: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ["markdown"] })
  contentType: "markdown";
}
