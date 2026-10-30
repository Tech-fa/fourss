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
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  dueDate?: number;

  @IsString()
  @IsNotEmpty()
  documentCode: string;

  @IsInt()
  @IsNotEmpty()
  documentTypeId?: number;

  @IsInt()
  @IsNotEmpty()
  teamId?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isAiAccessible?: boolean;
}

/** JSON body for PUT /documents/:id — metadata only, no file upload. */
export class UpdateDocumentDto extends DocumentDto {
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

  @Transform(({ value }) => parseJsonField(value))
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  processIds?: string[];
}
export class DocumentChecklistQuestionDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(DocumentChecklistQuestionType)
  @IsNotEmpty()
  questionType: DocumentChecklistQuestionType;

  @IsBoolean()
  @IsNotEmpty()
  required: boolean;

  @IsNumber()
  @IsOptional()
  orderIndex: number;
}

export class CreateDocumentChecklistDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DocumentChecklistQuestionDto)
  questions: DocumentChecklistQuestionDto[];
}

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsNumber()
  @IsOptional()
  dueDate?: number;

  @IsString()
  @IsNotEmpty()
  documentCode: string;

  @IsInt()
  @IsNotEmpty()
  documentTypeId?: number;

  @IsInt()
  @IsNotEmpty()
  teamId: number;

  @IsString()
  @IsNotEmpty()
  isPublic: string;

  @IsString()
  @IsOptional()
  isAiAccessible?: string;

  @IsString()
  @IsOptional()
  changes?: string;

  @IsNumber()
  @IsOptional()
  versionNumber?: number;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsString()
  @IsOptional()
  documentTemplateId?: string;

  /** If set, the draft is deleted after the document is created (not linked). */
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

  @Transform(({ value }) => parseJsonField(value))
  @IsArray()
  @IsOptional()
  @IsUUID("4", { each: true })
  processIds?: string[];

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
  @IsString()
  @IsOptional()
  changes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dueDate?: number;

  /** If set, the draft is deleted after the new version is created. */
  @IsUUID()
  @IsOptional()
  documentDraftId?: string;

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
  @IsString()
  @IsOptional()
  changes?: string;

  @IsUUID()
  @IsOptional()
  documentDraftId?: string;
}

/** Body for adding/replacing checklist content on a pending version. */
export class UploadVersionChecklistDto {
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

  @IsString()
  @IsOptional()
  changes?: string;

  @IsUUID()
  @IsOptional()
  documentDraftId?: string;
}

export class AddDocumentContentContributorsDto {
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
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string = "";

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
  @IsInt()
  @IsNotEmpty()
  requiredReviews: number;

  @IsInt()
  @IsNotEmpty()
  requiredApprovals: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsOptional()
  maxReviewDuration?: number;

  @IsInt()
  @IsOptional()
  maxApprovalDuration?: number;

  @IsBoolean()
  @IsOptional()
  allApprovers?: boolean;

  @IsBoolean()
  @IsOptional()
  allReviewers?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  teams?: IdReferenceDTO[];

  @IsInt()
  @IsOptional()
  documentTypeId?: number;

  @IsBoolean()
  @IsOptional()
  noReview?: boolean;

  @IsBoolean()
  @IsOptional()
  noApprove?: boolean;

  @IsBoolean()
  @IsOptional()
  allowOrdering?: boolean;
}

export class ApprovalStrategyParticipantDto {
  @IsNotEmpty()
  id: number | string;

  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}

export class ApprovalStrategyUserDto extends BaseUserDTO {
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateApprovalStrategyDto extends ApprovalStrategyDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyParticipantDto)
  approvers: ApprovalStrategyParticipantDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyParticipantDto)
  reviewers: ApprovalStrategyParticipantDto[];
}
export class ViewApprovalStrategyDto extends ApprovalStrategyDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyUserDto)
  approvers: ApprovalStrategyUserDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStrategyUserDto)
  reviewers: ApprovalStrategyUserDto[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class DocumentAcknowledgementDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  allUsers?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  teams?: IdReferenceDTO[];

  @IsInt()
  @IsOptional()
  documentTypeId?: number;
}

export class CreateDocumentAcknowledgementDto extends DocumentAcknowledgementDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IdReferenceDTO)
  users: IdReferenceDTO[];
}

export class ViewDocumentAcknowledgementDto extends DocumentAcknowledgementDto {
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
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., 'title', 'documentCode', 'createdAt'

  @IsOptional()
  @IsString()
  sortDir?: "asc" | "desc";

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  processId?: string;
}

export class DocumentTemplateFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  isDefault?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  @IsBoolean()
  searchTitleOnly?: boolean;
}

/** DTO for document template list items (templates tab + choose-template modal). */
export class DocumentTemplateDto {
  id: string;
  title: string;
  description: string;
  isDefault: boolean;
  createdAt: number;
}

export class CreateDocumentActionDto {
  type: DocumentActionType;
  comment?: string;

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
  @IsInt()
  @IsOptional()
  teamId?: number;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsString()
  @IsOptional()
  risks?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsArray()
  @IsNotEmpty()
  documentIds: string[];
}

export class UpdateChangeRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsInt()
  @IsOptional()
  teamId?: number;

  @IsString()
  @IsOptional()
  risks?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReviewChangeRequestDto {
  @IsEnum(ChangeRequestStatus)
  @IsNotEmpty()
  status: ChangeRequestStatus;

  @IsString()
  @IsOptional()
  reviewComment?: string;
}

export class ChangeRequestDto {
  @IsInt()
  id: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsString()
  @IsOptional()
  riskIdentified?: string;

  @IsEnum(ChangeRequestStatus)
  status: ChangeRequestStatus;

  @IsArray()
  documentIds: string[];

  @IsObject()
  @IsOptional()
  team?: { id: number; name: any };

  @ValidateNested()
  @Type(() => BaseUserDTO)
  requestedBy: BaseUserDTO;

  @ValidateNested()
  @Type(() => BaseUserDTO)
  @IsOptional()
  reviewedBy?: BaseUserDTO;

  @IsNumber()
  @IsOptional()
  reviewedAt?: number;

  @IsString()
  @IsOptional()
  reviewComment?: string;

  @IsNumber()
  createdAt: number;

  @IsNumber()
  updatedAt: number;
}

export class ViewChangeRequestDto extends ChangeRequestDto {
  documents: { id: string; title: string }[];
}

export class ChangeRequestFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ChangeRequestStatus)
  status?: ChangeRequestStatus;

  @IsOptional()
  @IsString()
  documentId?: string;
}

export class CreateDocumentTemplateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class CreateDocumentDraftDto {
  @IsString()
  @IsOptional()
  documentId?: string;

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
  @IsOptional()
  @IsString()
  search?: string;
}

export class DocumentDraftCreatedByDto {
  id: string;
  fname?: string;
  lname?: string;
}

export class DocumentDraftListItemDto {
  id: string;
  title: string;
  documentId: string | null;
  documentVersionId: number | null;
  document?: { id: string; title: string } | null;
  documentVersion?: { id: number; versionNumber: number } | null;
  createdBy?: DocumentDraftCreatedByDto;
  updatedAt: number;
  createdAt: number;
}

export class DocumentDraftDetailDto {
  id: string;
  title: string;
  documentId: string | null;
  documentVersionId: number | null;
  createdBy?: DocumentDraftCreatedByDto;
  /** Signed URL for draft docx content (SuperDoc). */
  contentUrl?: string;
}

export class AssistDocumentWriteMessageDto {
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  content: string;
}

export class AssistDocumentWriteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  prompt: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AssistDocumentWriteMessageDto)
  messages?: AssistDocumentWriteMessageDto[];

  @IsOptional()
  extraContext?: unknown;
}

export class DocumentWriteResponseDto {
  model: string;
  content: string;
  contentType: "markdown";
}
