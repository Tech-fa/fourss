import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  Res,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { formatResponse } from "../util/helper-util";
import { DocumentService } from "./document.service";
import {
  DocumentDto,
  DocumentTypeDto,
  DocumentFilterDto,
  CreateDocumentActionDto,
  CreateApprovalStrategyDto,
  CreateDocumentAcknowledgementDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateDocumentVersionDto,
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
  ReviewChangeRequestDto,
  UploadVersionEditorContentDto,
  UploadVersionChecklistDto,
  ChangeRequestFilterDto,
  CreateDocumentTemplateDto,
  DocumentTemplateFilterDto,
  CreateDocumentDraftDto,
  UpdateDocumentDraftDto,
  DocumentDraftFilterDto,
  AssistDocumentWriteDto,
} from "./dtos";
import { hasPermission } from "../authentication/permission.decorator";
import {
  DocumentTypePermission,
  approvalStrategyPermission,
  documentAcknowledgementPermission,
  PermissionEnum,
  DocumentPermission,
  changeRequestPermission,
  DocumentTemplatePermission,
} from "../permissions/permissions";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { PaginationDto } from "../common/pagination";
import { HistoryInterceptor } from "../history/history.interceptor";
@ApiTags("Documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}
  private readonly logger = new Logger(DocumentController.name);

  // Approval Strategy Endpoints

  @Get("approval-strategies")
  @ApiOperation({ summary: "List document approval strategies." })
  @hasPermission({
    subject: approvalStrategyPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getApprovalStrategies(
    @Query("search") search: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getApprovalStrategies(req.user, search),
      res,
      "Approval strategies fetched successfully",
    );
  }

  @Get("approval-strategies/:id")
  @ApiOperation({ summary: "Get one approval strategy." })
  @hasPermission({
    subject: approvalStrategyPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getApprovalStrategyById(
    @Param("id") id: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getApprovalStrategyById(Number(id), req.user),
      res,
      "Approval strategy fetched successfully",
    );
  }

  @Put("approval-strategies/:id")
  @ApiOperation({ summary: "Update an approval strategy." })
  @hasPermission({
    subject: approvalStrategyPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async updateApprovalStrategy(
    @Param("id") id: string,
    @Res() res,
    @Body() dto: CreateApprovalStrategyDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateApprovalStrategy(Number(id), dto, req.user),
      res,
      "Approval strategy updated successfully",
    );
  }

  @Delete("approval-strategies/:id")
  @ApiOperation({ summary: "Delete an approval strategy." })
  @hasPermission({
    subject: approvalStrategyPermission.subject,
    actions: [PermissionEnum.DELETE],
  })
  async deleteApprovalStrategy(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.deleteApprovalStrategy(Number(id)),
      res,
      "Approval strategy deleted successfully",
    );
  }

  @Post("approval-strategies")
  @ApiOperation({ summary: "Create an approval strategy." })
  @hasPermission({
    subject: approvalStrategyPermission.subject,
    actions: [PermissionEnum.CREATE],
  })
  async createApprovalStrategy(
    @Res() res,
    @Body() dto: CreateApprovalStrategyDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createApprovalStrategy(dto),
      res,
      "Approval strategy created successfully",
    );
  }

  // Document Acknowledgement Endpoints

  @Get("document-acknowledgements")
  @ApiOperation({ summary: "List document acknowledgement campaigns." })
  @hasPermission({
    subject: documentAcknowledgementPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getDocumentAcknowledgements(
    @Query("search") search: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentAcknowledgements(req.user, search),
      res,
      "Document acknowledgements fetched successfully",
    );
  }

  @Get("document-acknowledgements/:id")
  @ApiOperation({ summary: "Get one document acknowledgement campaign." })
  @hasPermission({
    subject: documentAcknowledgementPermission.subject,
    actions: [PermissionEnum.READ],
  })
  async getDocumentAcknowledgementById(
    @Param("id") id: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentAcknowledgementById(Number(id), req.user),
      res,
      "Document acknowledgement fetched successfully",
    );
  }

  @Put("document-acknowledgements/:id")
  @ApiOperation({ summary: "Update a document acknowledgement campaign." })
  @hasPermission({
    subject: documentAcknowledgementPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async updateDocumentAcknowledgement(
    @Param("id") id: string,
    @Res() res,
    @Body() dto: CreateDocumentAcknowledgementDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateDocumentAcknowledgement(
        Number(id),
        dto,
        req.user,
      ),
      res,
      "Document acknowledgement updated successfully",
    );
  }

  @Delete("document-acknowledgements/:id")
  @ApiOperation({ summary: "Delete a document acknowledgement campaign." })
  @hasPermission({
    subject: documentAcknowledgementPermission.subject,
    actions: [PermissionEnum.DELETE],
  })
  async deleteDocumentAcknowledgement(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocumentAcknowledgement(Number(id)),
      res,
      "Document acknowledgement deleted successfully",
    );
  }

  @Post("document-acknowledgements")
  @ApiOperation({ summary: "Create a document acknowledgement campaign." })
  @hasPermission({
    subject: documentAcknowledgementPermission.subject,
    actions: [PermissionEnum.CREATE],
  })
  async createDocumentAcknowledgement(
    @Res() res,
    @Body() dto: CreateDocumentAcknowledgementDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createDocumentAcknowledgement(dto),
      res,
      "Document acknowledgement created successfully",
    );
  }

  @Post()
  @ApiOperation({ summary: "Create a document." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["create"] })
  @UseInterceptors(FilesInterceptor("file"))
  async create(
    @Req() req,
    @Res() res,
    @Body() dto: CreateDocumentDto,
    @UploadedFiles() file: Array<any>,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createDocument(dto, req.user, file?.[0]),
      res,
      "Document created successfully",
    );
  }

  @Get("drafts")
  @ApiOperation({ summary: "List document drafts." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getDrafts(
    @Req() req,
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: DocumentDraftFilterDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentDrafts(
        req.user,
        paginationDto,
        filterDto,
      ),
      res,
      "Document drafts fetched successfully",
    );
  }

  @Get("drafts/:id")
  @ApiOperation({ summary: "Get one document draft." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getDraftById(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentDraftById(id, req.user),
      res,
      "Document draft fetched successfully",
    );
  }

  @Post("drafts")
  @ApiOperation({ summary: "Create a document draft." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["create"] })
  @UseInterceptors(FileInterceptor("file"))
  async createDraft(
    @Req() req,
    @Res() res,
    @Body() dto: CreateDocumentDraftDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.saveDocumentDraft(undefined, dto, req.user, file),
      res,
      "Document draft created successfully",
    );
  }

  @Put("drafts/:id")
  @ApiOperation({ summary: "Update a document draft." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  @UseInterceptors(FileInterceptor("file"))
  async updateDraft(
    @Param("id") id: string,
    @Req() req,
    @Res() res,
    @Body() dto: UpdateDocumentDraftDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.saveDocumentDraft(id, dto, req.user, file),
      res,
      "Document draft updated successfully",
    );
  }

  @Delete("drafts/:id")
  @ApiOperation({ summary: "Delete a document draft." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["delete"] })
  async deleteDraft(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocumentDraft(id, req.user),
      res,
      "Document draft deleted successfully",
    );
  }

  @Get()
  @ApiOperation({ summary: "List documents, with filters." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getAll(
    @Req() req,
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: DocumentFilterDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocuments(req.user, paginationDto, filterDto),
      res,
      "Documents fetched successfully",
    );
  }

  @Get("types")
  @ApiOperation({ summary: "List document types." })
  @hasPermission({
    subject: DocumentTypePermission.subject,
    actions: ["read"],
  })
  async getDocumentTypes(
    @Res() res: Response,
    @Query("search") search?: string,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentTypes(search),
      res,
      "Document types fetched successfully",
    );
  }

  @Get("versions/all")
  @ApiOperation({ summary: "List document versions across documents." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getDocumentVersions(
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: DocumentFilterDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentVersions(paginationDto, filterDto),
      res,
      "Document versions fetched successfully",
    );
  }
  @Post("change-requests")
  @ApiOperation({ summary: "Create a document change request." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["create"],
  })
  async createChangeRequest(
    @Res() res,
    @Body() dto: CreateChangeRequestDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createChangeRequest(dto, req.user),
      res,
      "Change request created successfully",
    );
  }

  @Get("change-requests")
  @ApiOperation({ summary: "List document change requests." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["read"],
  })
  async getChangeRequests(
    @Req() req,
    @Res() res,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: ChangeRequestFilterDto,
    @Query("documentId") documentId?: string,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getChangeRequests(
        req.user,
        paginationDto,
        filterDto,
      ),
      res,
      "Change requests fetched successfully",
    );
  }

  @Get("change-requests/:id")
  @ApiOperation({ summary: "Get one change request." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["read"],
  })
  async getChangeRequestById(@Param("id") id: string, @Req() req, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.getChangeRequestById(Number(id), req.user),
      res,
      "Change request fetched successfully",
    );
  }

  @Put("change-requests/:id")
  @ApiOperation({ summary: "Update a change request." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["update"],
  })
  async updateChangeRequest(
    @Param("id") id: string,
    @Res() res,
    @Body() dto: UpdateChangeRequestDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateChangeRequest(Number(id), dto, req.user),
      res,
      "Change request updated successfully",
    );
  }

  @Post("change-requests/:id/review")
  @ApiOperation({ summary: "Approve or reject a change request." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["update"],
  })
  async reviewChangeRequest(
    @Param("id") id: string,
    @Res() res,
    @Body() dto: ReviewChangeRequestDto,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.reviewChangeRequest(Number(id), dto, req.user),
      res,
      "Change request reviewed successfully",
    );
  }

  @Delete("change-requests/:id")
  @ApiOperation({ summary: "Delete a change request." })
  @hasPermission({
    subject: changeRequestPermission.subject,
    actions: ["delete"],
  })
  async deleteChangeRequest(@Param("id") id: string, @Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.documentService.deleteChangeRequest(Number(id), req.user),
      res,
      "Change request deleted successfully",
    );
  }

  @Post("types")
  @ApiOperation({ summary: "Create a document type." })
  @hasPermission({
    subject: DocumentTypePermission.subject,
    actions: ["create"],
  })
  async createDocumentType(
    @Res() res: Response,
    @Req() req,
    @Body() documentTypeDto: DocumentTypeDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createDocumentType(documentTypeDto, req.user),
      res,
      "Document type created successfully",
    );
  }

  // Document Template Endpoints
  @Get("templates")
  @ApiOperation({ summary: "List document templates." })
  @hasPermission({
    subject: DocumentTemplatePermission.subject,
    actions: ["read"],
  })
  async getDocumentTemplates(
    @Res() res: Response,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: DocumentTemplateFilterDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentTemplates(
        paginationDto ?? { page: 1, perPage: 10 },
        filterDto,
      ),
      res,
      "Document templates fetched successfully",
    );
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "Get one document template." })
  @hasPermission({
    subject: DocumentTemplatePermission.subject,
    actions: ["read"],
  })
  async getDocumentTemplateById(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentTemplateById(id),
      res,
      "Document template fetched successfully",
    );
  }

  @Post("templates")
  @ApiOperation({ summary: "Create a document template." })
  @hasPermission({
    subject: DocumentTemplatePermission.subject,
    actions: [PermissionEnum.CREATE],
  })
  @UseInterceptors(FileInterceptor("file"))
  async createDocumentTemplate(
    @Req() req,
    @Res() res,
    @Body() dto: CreateDocumentTemplateDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createDocumentTemplate(dto, req.user, file),
      res,
      "Document template created successfully",
    );
  }

  @Put("templates/:id")
  @ApiOperation({ summary: "Update a document template." })
  @hasPermission({
    subject: DocumentTemplatePermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  @UseInterceptors(FileInterceptor("file"))
  async updateDocumentTemplate(
    @Param("id") id: string,
    @Req() req,
    @Res() res,
    @Body() dto: CreateDocumentTemplateDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateDocumentTemplate(id, dto, req.user, file),
      res,
      "Document template updated successfully",
    );
  }

  @Delete("templates/:id")
  @ApiOperation({ summary: "Delete a document template." })
  @hasPermission({
    subject: DocumentTemplatePermission.subject,
    actions: ["delete"],
  })
  async deleteDocumentTemplate(@Param("id") id: string, @Res() res) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocumentTemplate(id),
      res,
      "Document template deleted successfully",
    );
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a document." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  async update(
    @Param("id") id: string,
    @Res() res,
    @Req() req,
    @Body() dto: UpdateDocumentDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateDocument(id, dto, req.user),
      res,
      "Document updated successfully",
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a document." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["delete"] })
  async delete(@Param("id") id: string, @Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocument(id, req.user),
      res,
      "Document deleted successfully",
    );
  }

  @Get("types/:id")
  @ApiOperation({ summary: "Get one document type." })
  @hasPermission({
    subject: DocumentTypePermission.subject,
    actions: ["read"],
  })
  async getDocumentTypeById(@Res() res: Response, @Param("id") id: string) {
    return formatResponse(
      this.logger,
      this.documentService.getDocumentTypeById(parseInt(id)),
      res,
      "Document type fetched successfully",
    );
  }

  @Put("types/:id")
  @ApiOperation({ summary: "Update a document type." })
  @hasPermission({
    subject: DocumentTypePermission.subject,
    actions: ["update"],
  })
  async updateDocumentType(
    @Res() res: Response,
    @Param("id") id: string,
    @Body() documentTypeDto: DocumentTypeDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.updateDocumentType(parseInt(id), documentTypeDto),
      res,
      "Document type updated successfully",
    );
  }

  @Delete("types/:id")
  @ApiOperation({ summary: "Delete a document type." })
  @hasPermission({
    subject: DocumentTypePermission.subject,
    actions: ["delete"],
  })
  async deleteDocumentType(@Res() res: Response, @Param("id") id: string) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocumentType(parseInt(id)),
      res,
      "Document type deleted successfully",
    );
  }

  @Post(":id/actions")
  @ApiOperation({
    summary: "Record an approval or review action on a document.",
  })
  @hasPermission({
    subject: DocumentPermission.subject,
    actions: ["read"],
  })
  async createDocumentAction(
    @Res() res: Response,
    @Req() req,
    @Body() createDocumentActionDto: CreateDocumentActionDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createDocumentAction(
        createDocumentActionDto,
        req.params.id,
        req.user,
      ),
      res,
      "Document action created successfully",
    );
  }

  @Put(":id/override-approve")
  @ApiOperation({
    summary: "Approve a document without the normal approval path.",
  })
  @hasPermission({
    subject: DocumentPermission.subject,
    actions: ["override_approve"],
  })
  async overrideApprove(@Param("id") id: string, @Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.documentService.overrideApprove(id, req.user),
      res,
      "Document approved successfully",
    );
  }

  @Put(":id/mark-obsolete")
  @ApiOperation({ summary: "Mark a document obsolete." })
  @hasPermission({
    subject: DocumentPermission.subject,
    actions: ["update"],
  })
  async markObsolete(@Param("id") id: string, @Res() res, @Req() req) {
    return formatResponse(
      this.logger,
      this.documentService.markObsolete(id, req.user),
      res,
      "Document marked as obsolete successfully",
    );
  }

  @Delete(":id/actions/:actionId")
  @ApiOperation({ summary: "Delete a document action." })
  async deleteDocumentAction(
    @Param("id") documentId: string,
    @Param("actionId") actionId: string,
    @Res() res,
    @Req() req,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.deleteDocumentAction(documentId, actionId, req.user),
      res,
      "Comment deleted successfully",
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one document." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getDocumentById(
    @Param("id") id: string,
    @Query("includeLatestPublishedContent")
    includeLatestPublishedContent: string,
    @Req() req,
    @Res() res,
  ) {
    const options =
      includeLatestPublishedContent === "true" ||
      includeLatestPublishedContent === "1"
        ? { includeLatestPublishedContent: true }
        : undefined;
    return formatResponse(
      this.logger,
      this.documentService.viewDocument(id, req.user, options),
      res,
      "Document fetched successfully",
    );
  }

  @Post(":id/versions")
  @ApiOperation({ summary: "Create a new version of a document." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  @UseInterceptors(FileInterceptor("file"))
  async createNewVersion(
    @Param("id") id: string,
    @Res() res,
    @Req() req,
    @Body() dto: CreateDocumentVersionDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.createNewVersion(id, dto, req.user, file),
      res,
      "Document version created successfully",
    );
  }

  @Get(":id/versions/:versionId/content")
  @ApiOperation({
    summary: "Get the file or editor content of a document version.",
  })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  async getVersionContent(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Req() req,
    @Res() res,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.getVersionContent(id, Number(versionId), req.user),
      res,
      "Version content fetched successfully",
    );
  }

  @Post(":id/versions/:versionId/upload-file")
  @ApiOperation({ summary: "Upload a file for a document version." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  @UseInterceptors(FilesInterceptor("file"))
  async uploadVersionFile(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Req() req,
    @Res() res,
    @Body() dto: CreateDocumentVersionDto,
    @UploadedFiles() files?: Array<any>,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.uploadVersionFile(
        id,
        Number(versionId),
        req.user,
        files?.[0],
        dto.changes,
      ),
      res,
      "File uploaded successfully",
    );
  }

  @Put(":id/versions/:versionId/review-comments")
  @ApiOperation({ summary: "Save review comments on a document version." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["read"] })
  @UseInterceptors(FileInterceptor("file"))
  async saveVersionReviewComments(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Req() req,
    @Res() res,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.saveVersionReviewComments(
        id,
        Number(versionId),
        req.user,
        file,
      ),
      res,
      "Review comments saved for this version",
    );
  }

  @Put(":id/versions/:versionId/editor-content")
  @ApiOperation({ summary: "Save editor content for a document version." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  @UseInterceptors(FileInterceptor("file"))
  async uploadVersionEditorContent(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Req() req,
    @Res() res,
    @Body() dto: UploadVersionEditorContentDto,
    @UploadedFile() file?: any,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.uploadVersionEditorContent(
        id,
        Number(versionId),
        dto,
        req.user,
        file,
      ),
      res,
      "Editor content saved for this version",
    );
  }

  @Put(":id/versions/:versionId/checklist")
  @ApiOperation({ summary: "Save the checklist for a document version." })
  @hasPermission({ subject: DocumentPermission.subject, actions: ["update"] })
  async uploadVersionChecklist(
    @Param("id") id: string,
    @Param("versionId") versionId: string,
    @Req() req,
    @Res() res,
    @Body() dto: UploadVersionChecklistDto,
  ) {
    return formatResponse(
      this.logger,
      this.documentService.uploadVersionChecklist(
        id,
        Number(versionId),
        dto,
        req.user,
      ),
      res,
      "Checklist saved for this version",
    );
  }

  // Change Request Endpoints
}
