import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType, DocumentStatus } from "./document.enums";
import { DocumentActionType } from "./document-action.entity";
import { DocumentChecklistQuestionType } from "./document-checklist-question.entity";
import { ChangeRequestStatus } from "./change-request.entity";
import {
  CreateDocumentDto,
  CreateDocumentDraftDto,
  CreateDocumentTemplateDto,
  CreateDocumentVersionDto,
  DocumentTemplateDto,
  DocumentDraftListItemDto,
  ChangeRequestDto,
  UploadVersionEditorContentDto,
} from "./dtos";

export class NumericIdResponseDto {
  @ApiProperty()
  id: number;
}

export class StringIdResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;
}

export class DocumentVersionCreatedResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  version: number;
}

export class AgentRulesResponseDto {
  @ApiProperty()
  text: string;
}

export class DocumentTextResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  documentCode: string;

  @ApiProperty()
  versionId: number;

  @ApiProperty()
  text: string;
}

export class VersionContentResponseDto {
  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiPropertyOptional()
  contentUrl?: string;

  @ApiPropertyOptional()
  contentBase64?: string;
}

export class VersionFileUploadedResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  file: string;
}

export class VersionEditorSavedResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  content: string;
}

export class ChecklistQuestionResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  required: boolean;

  @ApiProperty({ enum: DocumentChecklistQuestionType })
  questionType: DocumentChecklistQuestionType;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class ChecklistResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty({ nullable: true })
  documentVersionId: number | null;

  @ApiProperty({ type: [ChecklistQuestionResponseDto] })
  questions: ChecklistQuestionResponseDto[];

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class VersionChecklistSavedResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty({ type: ChecklistResponseDto })
  checklist: ChecklistResponseDto;
}

export class DocumentActionResultResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}

export class DocumentPersonResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;

  @ApiProperty({ format: "email" })
  email: string;
}

export class OrderedDocumentPersonResponseDto extends DocumentPersonResponseDto {
  @ApiPropertyOptional()
  order?: number;
}

export class NamedRefResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class DocumentTypeCreatedByResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;
}

export class DocumentTypeResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  categoryCode: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiPropertyOptional({ type: DocumentTypeCreatedByResponseDto })
  createdBy?: DocumentTypeCreatedByResponseDto;

  @ApiPropertyOptional({
    description: "Count of documents still using this category.",
  })
  documentsCount?: number;
}

export class DocumentListVersionResponseDto {
  @ApiPropertyOptional()
  file?: string;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;
}

export class DocumentListItemResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  documentCode: string;

  @ApiProperty({ enum: ContentType, nullable: true })
  contentType: ContentType | null;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  isAiAccessible: boolean;

  @ApiProperty()
  currentVersion: number;

  @ApiProperty({ type: NamedRefResponseDto })
  documentType: NamedRefResponseDto;

  @ApiProperty({ type: NamedRefResponseDto })
  team: NamedRefResponseDto;

  @ApiProperty({ type: DocumentTypeCreatedByResponseDto })
  createdBy: DocumentTypeCreatedByResponseDto;

  @ApiProperty({ type: [DocumentListVersionResponseDto] })
  versions: DocumentListVersionResponseDto[];

  @ApiProperty({
    type: [DocumentListVersionResponseDto],
    description: "Versions newer than the current version.",
  })
  newVersions: DocumentListVersionResponseDto[];

  @ApiProperty()
  totalChangeRequests: number;
}

export class PaginatedDocumentListResponseDto {
  @ApiProperty({ type: [DocumentListItemResponseDto] })
  data: DocumentListItemResponseDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  perPage: number;
}

export class DocumentVersionListDocumentResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  documentCode: string;

  @ApiProperty({ enum: ContentType, nullable: true })
  contentType: ContentType | null;

  @ApiProperty({ type: NamedRefResponseDto })
  documentType: NamedRefResponseDto;

  @ApiProperty({ type: NamedRefResponseDto })
  team: NamedRefResponseDto;

  @ApiProperty({ type: DocumentTypeCreatedByResponseDto })
  createdBy: DocumentTypeCreatedByResponseDto;
}

export class DocumentVersionListItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty({ format: "uuid" })
  createdById: string;

  @ApiProperty({ format: "uuid" })
  documentId: string;

  @ApiProperty()
  file: string;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty({ nullable: true })
  changes: string | null;

  @ApiProperty({ nullable: true })
  reasonForChange: string | null;

  @ApiProperty({ nullable: true })
  changeRequestId: number | null;

  @ApiProperty({ type: DocumentVersionListDocumentResponseDto })
  document: DocumentVersionListDocumentResponseDto;
}

export class PaginatedDocumentVersionListResponseDto {
  @ApiProperty({ type: [DocumentVersionListItemResponseDto] })
  data: DocumentVersionListItemResponseDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  perPage: number;
}

export class ApprovalStrategyListItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  requiredReviews: number;

  @ApiProperty()
  requiredApprovals: number;

  @ApiPropertyOptional({ nullable: true })
  maxReviewDuration?: number | null;

  @ApiPropertyOptional({ nullable: true })
  maxApprovalDuration?: number | null;

  @ApiProperty()
  allApprovers: boolean;

  @ApiProperty()
  allReviewers: boolean;

  @ApiProperty()
  allowOrdering: boolean;

  @ApiProperty()
  noReview: boolean;

  @ApiProperty()
  noApprove: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty({ type: [NamedRefResponseDto] })
  teams: NamedRefResponseDto[];

  @ApiProperty({ type: DocumentTypeResponseDto, nullable: true })
  documentType: DocumentTypeResponseDto | null;
}

export class AcknowledgementListItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  allUsers: boolean;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty({ type: [NamedRefResponseDto] })
  teams: NamedRefResponseDto[];

  @ApiProperty({ type: DocumentTypeResponseDto, nullable: true })
  documentType: DocumentTypeResponseDto | null;
}

export class DocumentTemplateListResponseDto {
  @ApiProperty({ type: [DocumentTemplateDto] })
  data: DocumentTemplateDto[];

  @ApiProperty()
  totalCount: number;
}

export class DocumentTemplateDetailResponseDto extends DocumentTemplateDto {
  @ApiProperty({ description: "Signed URL for the template file." })
  content: string;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  deleted: boolean;

  @ApiPropertyOptional({ type: DocumentPersonResponseDto })
  createdBy?: DocumentPersonResponseDto;
}

export class PaginatedDraftListResponseDto {
  @ApiProperty({ type: [DocumentDraftListItemDto] })
  data: DocumentDraftListItemDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  perPage: number;
}

export class PaginatedChangeRequestListResponseDto {
  @ApiProperty({ type: [ChangeRequestDto] })
  data: ChangeRequestDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  perPage: number;
}

export class ChangeRequestRecordResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty({ nullable: true })
  justification: string | null;

  @ApiProperty({ nullable: true })
  risks: string | null;

  @ApiProperty({ enum: ChangeRequestStatus })
  status: ChangeRequestStatus;

  @ApiProperty()
  teamId: number;

  @ApiProperty({ format: "uuid" })
  requestedById: string;

  @ApiProperty({ nullable: true, format: "uuid" })
  reviewedById: string | null;

  @ApiProperty({ nullable: true })
  reviewedAt: number | null;

  @ApiProperty({ nullable: true })
  reviewComment: string | null;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}

export class DocumentCommentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  text: string;
}

export class DocumentActionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: DocumentActionType })
  type: DocumentActionType;

  @ApiProperty({ enum: DocumentActionType })
  actionType: DocumentActionType;

  @ApiProperty()
  createdDate: number;

  @ApiPropertyOptional({ type: DocumentCommentResponseDto, nullable: true })
  comment?: DocumentCommentResponseDto | null;
}

export class DocumentContributorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: DocumentPersonResponseDto })
  user: DocumentPersonResponseDto;

  @ApiProperty({ description: "Version number this contribution belongs to." })
  version: number;

  @ApiProperty({ type: [DocumentActionResponseDto] })
  actions: DocumentActionResponseDto[];
}

export class DocumentVersionDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty({ format: "uuid" })
  createdById: string;

  @ApiProperty({ format: "uuid" })
  documentId: string;

  @ApiProperty()
  file: string;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty({ nullable: true })
  changes: string | null;

  @ApiProperty({ nullable: true })
  reasonForChange: string | null;

  @ApiProperty({ nullable: true })
  changeRequestId: number | null;

  @ApiPropertyOptional({ type: ChecklistResponseDto, nullable: true })
  checklist?: ChecklistResponseDto | null;
}

export class DocumentIdRefResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;
}

export class ChangeRequestIdResponseDto {
  @ApiProperty()
  id: number;
}

export class DocumentDetailResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  dueDate: number | null;

  @ApiProperty()
  documentCode: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  isAiAccessible: boolean;

  @ApiProperty()
  isObsolete: boolean;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  currentVersion: number;

  @ApiProperty()
  approvalDate: number;

  @ApiProperty()
  approvalDueDate: number;

  @ApiProperty()
  obsoleteDate: number;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty({ enum: ContentType, nullable: true })
  contentType: ContentType | null;

  @ApiProperty({ type: DocumentTypeResponseDto })
  documentType: DocumentTypeResponseDto;

  @ApiProperty({ type: NamedRefResponseDto })
  team: NamedRefResponseDto;

  @ApiProperty({ type: DocumentPersonResponseDto })
  createdBy: DocumentPersonResponseDto;

  @ApiProperty({ type: [DocumentVersionDetailResponseDto] })
  versions: DocumentVersionDetailResponseDto[];

  @ApiProperty({ type: [DocumentContributorResponseDto] })
  contributors: DocumentContributorResponseDto[];

  @ApiProperty({ type: [OrderedDocumentPersonResponseDto] })
  approvers: OrderedDocumentPersonResponseDto[];

  @ApiProperty({ type: [OrderedDocumentPersonResponseDto] })
  reviewers: OrderedDocumentPersonResponseDto[];

  @ApiProperty({ type: [DocumentPersonResponseDto] })
  acknowledgers: DocumentPersonResponseDto[];

  @ApiProperty({ type: [DocumentPersonResponseDto] })
  contentContributors: DocumentPersonResponseDto[];

  @ApiProperty({ type: ChangeRequestIdResponseDto, nullable: true })
  changeRequest: ChangeRequestIdResponseDto | null;

  @ApiProperty({ type: DocumentIdRefResponseDto, nullable: true })
  documentTemplate: DocumentIdRefResponseDto | null;

  @ApiPropertyOptional()
  latestPublishedVersionContent?: string;

  @ApiPropertyOptional()
  latestPublishedVersionContentUrl?: string;

  @ApiPropertyOptional()
  pendingVersionContent?: string;

  @ApiPropertyOptional()
  pendingVersionContentUrl?: string;

  @ApiProperty({ type: "object", additionalProperties: true })
  approvalStrategy: Record<string, unknown>;

  @ApiProperty({ type: "object", additionalProperties: true, nullable: true })
  documentAcknowledgement: Record<string, unknown> | null;
}

export class CreateDocumentBodyDto extends CreateDocumentDto {
  @ApiPropertyOptional({ type: "string", format: "binary" })
  file?: string;
}

export class CreateDocumentDraftBodyDto extends CreateDocumentDraftDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: string;
}

export class UpdateDocumentDraftBodyDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: string;
}

export class CreateDocumentTemplateBodyDto extends CreateDocumentTemplateDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: string;
}

export class UpdateDocumentTemplateBodyDto extends CreateDocumentTemplateDto {
  @ApiPropertyOptional({ type: "string", format: "binary" })
  file?: string;
}

export class CreateDocumentVersionBodyDto extends CreateDocumentVersionDto {
  @ApiPropertyOptional({ type: "string", format: "binary" })
  file?: string;
}

export class UploadVersionFileBodyDto extends CreateDocumentVersionDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: string;
}

export class UploadVersionEditorContentBodyDto extends UploadVersionEditorContentDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Docx file for this version.",
  })
  file: string;
}

export class ReviewCommentsBodyDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "Docx file with review comments.",
  })
  file: string;
}
