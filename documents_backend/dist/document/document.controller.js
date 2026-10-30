"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentController_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helper_util_1 = require("../util/helper-util");
const document_service_1 = require("./document.service");
const dtos_1 = require("./dtos");
const agent_rules_service_1 = require("./agent-rules.service");
const permission_decorator_1 = require("../authentication/permission.decorator");
const permissions_1 = require("../permissions/permissions");
const platform_express_1 = require("@nestjs/platform-express");
const pagination_1 = require("../common/pagination");
let DocumentController = DocumentController_1 = class DocumentController {
    documentService;
    agentRulesService;
    constructor(documentService, agentRulesService) {
        this.documentService = documentService;
        this.agentRulesService = agentRulesService;
    }
    logger = new common_1.Logger(DocumentController_1.name);
    async getApprovalStrategies(search, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getApprovalStrategies(req.user, search), res, "Approval strategies fetched successfully");
    }
    async getApprovalStrategyById(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getApprovalStrategyById(Number(id), req.user), res, "Approval strategy fetched successfully");
    }
    async updateApprovalStrategy(id, res, dto, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateApprovalStrategy(Number(id), dto, req.user), res, "Approval strategy updated successfully");
    }
    async deleteApprovalStrategy(id, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteApprovalStrategy(Number(id)), res, "Approval strategy deleted successfully");
    }
    async createApprovalStrategy(res, dto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createApprovalStrategy(dto), res, "Approval strategy created successfully");
    }
    async getDocumentAcknowledgements(search, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentAcknowledgements(req.user, search), res, "Document acknowledgements fetched successfully");
    }
    async getDocumentAcknowledgementById(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentAcknowledgementById(Number(id), req.user), res, "Document acknowledgement fetched successfully");
    }
    async updateDocumentAcknowledgement(id, res, dto, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateDocumentAcknowledgement(Number(id), dto, req.user), res, "Document acknowledgement updated successfully");
    }
    async deleteDocumentAcknowledgement(id, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocumentAcknowledgement(Number(id)), res, "Document acknowledgement deleted successfully");
    }
    async createDocumentAcknowledgement(res, dto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createDocumentAcknowledgement(dto), res, "Document acknowledgement created successfully");
    }
    async create(req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createDocument(dto, req.user, file?.[0]), res, "Document created successfully");
    }
    async getDrafts(req, res, paginationDto, filterDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentDrafts(req.user, paginationDto, filterDto), res, "Document drafts fetched successfully");
    }
    async getDraftById(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentDraftById(id, req.user), res, "Document draft fetched successfully");
    }
    async createDraft(req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.saveDocumentDraft(undefined, dto, req.user, file), res, "Document draft created successfully");
    }
    async updateDraft(id, req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.saveDocumentDraft(id, dto, req.user, file), res, "Document draft updated successfully");
    }
    async deleteDraft(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocumentDraft(id, req.user), res, "Document draft deleted successfully");
    }
    async getAll(req, res, paginationDto, filterDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocuments(req.user, paginationDto, filterDto), res, "Documents fetched successfully");
    }
    async getDocumentTypes(res, search) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentTypes(search), res, "Document types fetched successfully");
    }
    async getDocumentVersions(res, paginationDto, filterDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentVersions(paginationDto, filterDto), res, "Document versions fetched successfully");
    }
    async createChangeRequest(res, dto, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createChangeRequest(dto, req.user), res, "Change request created successfully");
    }
    async getChangeRequests(req, res, paginationDto, filterDto, documentId) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getChangeRequests(req.user, paginationDto, filterDto), res, "Change requests fetched successfully");
    }
    async getChangeRequestById(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getChangeRequestById(Number(id), req.user), res, "Change request fetched successfully");
    }
    async updateChangeRequest(id, res, dto, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateChangeRequest(Number(id), dto, req.user), res, "Change request updated successfully");
    }
    async reviewChangeRequest(id, res, dto, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.reviewChangeRequest(Number(id), dto, req.user), res, "Change request reviewed successfully");
    }
    async deleteChangeRequest(id, res, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteChangeRequest(Number(id), req.user), res, "Change request deleted successfully");
    }
    async createDocumentType(res, req, documentTypeDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createDocumentType(documentTypeDto, req.user), res, "Document type created successfully");
    }
    async getDocumentTemplates(res, paginationDto, filterDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentTemplates(paginationDto ?? { page: 1, perPage: 10 }, filterDto), res, "Document templates fetched successfully");
    }
    async getDocumentTemplateById(id, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentTemplateById(id), res, "Document template fetched successfully");
    }
    async createDocumentTemplate(req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createDocumentTemplate(dto, req.user, file), res, "Document template created successfully");
    }
    async updateDocumentTemplate(id, req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateDocumentTemplate(id, dto, req.user, file), res, "Document template updated successfully");
    }
    async deleteDocumentTemplate(id, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocumentTemplate(id), res, "Document template deleted successfully");
    }
    async update(id, res, req, dto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateDocument(id, dto, req.user), res, "Document updated successfully");
    }
    async delete(id, res, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocument(id, req.user), res, "Document deleted successfully");
    }
    async getDocumentTypeById(res, id) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentTypeById(parseInt(id)), res, "Document type fetched successfully");
    }
    async updateDocumentType(res, id, documentTypeDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.updateDocumentType(parseInt(id), documentTypeDto), res, "Document type updated successfully");
    }
    async deleteDocumentType(res, id) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocumentType(parseInt(id)), res, "Document type deleted successfully");
    }
    async createDocumentAction(res, req, createDocumentActionDto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createDocumentAction(createDocumentActionDto, req.params.id, req.user), res, "Document action created successfully");
    }
    async overrideApprove(id, res, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.overrideApprove(id, req.user), res, "Document approved successfully");
    }
    async markObsolete(id, res, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.markObsolete(id, req.user), res, "Document marked as obsolete successfully");
    }
    async deleteDocumentAction(documentId, actionId, res, req) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.deleteDocumentAction(documentId, actionId, req.user), res, "Comment deleted successfully");
    }
    async getAgentRules(res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.agentRulesService.getRules(), res, "Agent rules fetched successfully");
    }
    async getDocumentText(id, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getDocumentText(id, req.user), res, "Document text fetched successfully");
    }
    async getDocumentById(id, includeLatestPublishedContent, req, res) {
        const options = includeLatestPublishedContent === "true" ||
            includeLatestPublishedContent === "1"
            ? { includeLatestPublishedContent: true }
            : undefined;
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.viewDocument(id, req.user, options), res, "Document fetched successfully");
    }
    async addContentContributors(id, dto, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.addContentContributors(id, dto.userIds, req.user), res, "Document contributors added successfully");
    }
    async removeContentContributor(id, userId, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.removeContentContributor(id, userId, req.user), res, "Document contributor removed successfully");
    }
    async createNewVersion(id, res, req, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.createNewVersion(id, dto, req.user, file), res, "Document version created successfully");
    }
    async getVersionContent(id, versionId, req, res) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.getVersionContent(id, Number(versionId), req.user), res, "Version content fetched successfully");
    }
    async uploadVersionFile(id, versionId, req, res, dto, files) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.uploadVersionFile(id, Number(versionId), req.user, files?.[0], dto.changes), res, "File uploaded successfully");
    }
    async saveVersionReviewComments(id, versionId, req, res, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.saveVersionReviewComments(id, Number(versionId), req.user, file), res, "Review comments saved for this version");
    }
    async uploadVersionEditorContent(id, versionId, req, res, dto, file) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.uploadVersionEditorContent(id, Number(versionId), dto, req.user, file), res, "Editor content saved for this version");
    }
    async uploadVersionChecklist(id, versionId, req, res, dto) {
        return (0, helper_util_1.formatResponse)(this.logger, this.documentService.uploadVersionChecklist(id, Number(versionId), dto, req.user), res, "Checklist saved for this version");
    }
};
exports.DocumentController = DocumentController;
__decorate([
    (0, common_1.Get)("approval-strategies"),
    (0, swagger_1.ApiOperation)({ summary: "List document approval strategies." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.approvalStrategyPermission.subject,
        actions: [permissions_1.PermissionEnum.READ],
    }),
    __param(0, (0, common_1.Query)("search")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getApprovalStrategies", null);
__decorate([
    (0, common_1.Get)("approval-strategies/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one approval strategy." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.approvalStrategyPermission.subject,
        actions: [permissions_1.PermissionEnum.READ],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getApprovalStrategyById", null);
__decorate([
    (0, common_1.Put)("approval-strategies/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update an approval strategy." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.approvalStrategyPermission.subject,
        actions: [permissions_1.PermissionEnum.UPDATE],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dtos_1.CreateApprovalStrategyDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateApprovalStrategy", null);
__decorate([
    (0, common_1.Delete)("approval-strategies/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete an approval strategy." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.approvalStrategyPermission.subject,
        actions: [permissions_1.PermissionEnum.DELETE],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteApprovalStrategy", null);
__decorate([
    (0, common_1.Post)("approval-strategies"),
    (0, swagger_1.ApiOperation)({ summary: "Create an approval strategy." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.approvalStrategyPermission.subject,
        actions: [permissions_1.PermissionEnum.CREATE],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateApprovalStrategyDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createApprovalStrategy", null);
__decorate([
    (0, common_1.Get)("document-acknowledgements"),
    (0, swagger_1.ApiOperation)({ summary: "List document acknowledgement campaigns." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.documentAcknowledgementPermission.subject,
        actions: [permissions_1.PermissionEnum.READ],
    }),
    __param(0, (0, common_1.Query)("search")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentAcknowledgements", null);
__decorate([
    (0, common_1.Get)("document-acknowledgements/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one document acknowledgement campaign." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.documentAcknowledgementPermission.subject,
        actions: [permissions_1.PermissionEnum.READ],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentAcknowledgementById", null);
__decorate([
    (0, common_1.Put)("document-acknowledgements/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a document acknowledgement campaign." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.documentAcknowledgementPermission.subject,
        actions: [permissions_1.PermissionEnum.UPDATE],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dtos_1.CreateDocumentAcknowledgementDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateDocumentAcknowledgement", null);
__decorate([
    (0, common_1.Delete)("document-acknowledgements/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document acknowledgement campaign." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.documentAcknowledgementPermission.subject,
        actions: [permissions_1.PermissionEnum.DELETE],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocumentAcknowledgement", null);
__decorate([
    (0, common_1.Post)("document-acknowledgements"),
    (0, swagger_1.ApiOperation)({ summary: "Create a document acknowledgement campaign." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.documentAcknowledgementPermission.subject,
        actions: [permissions_1.PermissionEnum.CREATE],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateDocumentAcknowledgementDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDocumentAcknowledgement", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "Create a document." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["create"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("file")),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, dtos_1.CreateDocumentDto,
        Array]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("drafts"),
    (0, swagger_1.ApiOperation)({ summary: "List document drafts." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, pagination_1.PaginationDto,
        dtos_1.DocumentDraftFilterDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDrafts", null);
__decorate([
    (0, common_1.Get)("drafts/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one document draft." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDraftById", null);
__decorate([
    (0, common_1.Post)("drafts"),
    (0, swagger_1.ApiOperation)({ summary: "Create a document draft." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["create"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, dtos_1.CreateDocumentDraftDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDraft", null);
__decorate([
    (0, common_1.Put)("drafts/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a document draft." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, dtos_1.UpdateDocumentDraftDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Delete)("drafts/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document draft." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["delete"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDraft", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "List documents, with filters." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, pagination_1.PaginationDto,
        dtos_1.DocumentFilterDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)("types"),
    (0, swagger_1.ApiOperation)({ summary: "List document types." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTypePermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)("search")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentTypes", null);
__decorate([
    (0, common_1.Get)("versions/all"),
    (0, swagger_1.ApiOperation)({ summary: "List document versions across documents." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, pagination_1.PaginationDto,
        dtos_1.DocumentFilterDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentVersions", null);
__decorate([
    (0, common_1.Post)("change-requests"),
    (0, swagger_1.ApiOperation)({ summary: "Create a document change request." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["create"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.CreateChangeRequestDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createChangeRequest", null);
__decorate([
    (0, common_1.Get)("change-requests"),
    (0, swagger_1.ApiOperation)({ summary: "List document change requests." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)()),
    __param(4, (0, common_1.Query)("documentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, pagination_1.PaginationDto,
        dtos_1.ChangeRequestFilterDto, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getChangeRequests", null);
__decorate([
    (0, common_1.Get)("change-requests/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one change request." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getChangeRequestById", null);
__decorate([
    (0, common_1.Put)("change-requests/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a change request." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["update"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dtos_1.UpdateChangeRequestDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateChangeRequest", null);
__decorate([
    (0, common_1.Post)("change-requests/:id/review"),
    (0, swagger_1.ApiOperation)({ summary: "Approve or reject a change request." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["update"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dtos_1.ReviewChangeRequestDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "reviewChangeRequest", null);
__decorate([
    (0, common_1.Delete)("change-requests/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a change request." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.changeRequestPermission.subject,
        actions: ["delete"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteChangeRequest", null);
__decorate([
    (0, common_1.Post)("types"),
    (0, swagger_1.ApiOperation)({ summary: "Create a document type." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTypePermission.subject,
        actions: ["create"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, Object, dtos_1.DocumentTypeDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDocumentType", null);
__decorate([
    (0, common_1.Get)("templates"),
    (0, swagger_1.ApiOperation)({ summary: "List document templates." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTemplatePermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response,
        pagination_1.PaginationDto,
        dtos_1.DocumentTemplateFilterDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentTemplates", null);
__decorate([
    (0, common_1.Get)("templates/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one document template." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTemplatePermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentTemplateById", null);
__decorate([
    (0, common_1.Post)("templates"),
    (0, swagger_1.ApiOperation)({ summary: "Create a document template." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTemplatePermission.subject,
        actions: [permissions_1.PermissionEnum.CREATE],
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, dtos_1.CreateDocumentTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDocumentTemplate", null);
__decorate([
    (0, common_1.Put)("templates/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a document template." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTemplatePermission.subject,
        actions: [permissions_1.PermissionEnum.UPDATE],
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, dtos_1.CreateDocumentTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateDocumentTemplate", null);
__decorate([
    (0, common_1.Delete)("templates/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document template." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTemplatePermission.subject,
        actions: ["delete"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocumentTemplate", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a document." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, dtos_1.UpdateDocumentDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["delete"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)("types/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one document type." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTypePermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentTypeById", null);
__decorate([
    (0, common_1.Put)("types/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Update a document type." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTypePermission.subject,
        actions: ["update"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, String, dtos_1.DocumentTypeDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "updateDocumentType", null);
__decorate([
    (0, common_1.Delete)("types/:id"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document type." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentTypePermission.subject,
        actions: ["delete"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocumentType", null);
__decorate([
    (0, common_1.Post)(":id/actions"),
    (0, swagger_1.ApiOperation)({
        summary: "Record an approval or review action on a document.",
    }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentPermission.subject,
        actions: ["read"],
    }),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Response, Object, dtos_1.CreateDocumentActionDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createDocumentAction", null);
__decorate([
    (0, common_1.Put)(":id/override-approve"),
    (0, swagger_1.ApiOperation)({
        summary: "Approve a document without the normal approval path.",
    }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentPermission.subject,
        actions: ["override_approve"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "overrideApprove", null);
__decorate([
    (0, common_1.Put)(":id/mark-obsolete"),
    (0, swagger_1.ApiOperation)({ summary: "Mark a document obsolete." }),
    (0, permission_decorator_1.hasPermission)({
        subject: permissions_1.DocumentPermission.subject,
        actions: ["update"],
    }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "markObsolete", null);
__decorate([
    (0, common_1.Delete)(":id/actions/:actionId"),
    (0, swagger_1.ApiOperation)({ summary: "Delete a document action." }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("actionId")),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocumentAction", null);
__decorate([
    (0, common_1.Get)("agent/rules"),
    (0, swagger_1.ApiOperation)({ summary: "Get the rules file the agent follows." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getAgentRules", null);
__decorate([
    (0, common_1.Get)(":id/text"),
    (0, swagger_1.ApiOperation)({
        summary: "Get the extracted text of a document when extraction is ready.",
    }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentText", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "Get one document." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("includeLatestPublishedContent")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDocumentById", null);
__decorate([
    (0, common_1.Post)(":id/content-contributors"),
    (0, swagger_1.ApiOperation)({
        summary: "Add people who can edit this document and create new versions.",
    }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dtos_1.AddDocumentContentContributorsDto, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "addContentContributors", null);
__decorate([
    (0, common_1.Delete)(":id/content-contributors/:userId"),
    (0, swagger_1.ApiOperation)({
        summary: "Remove a person who can edit this document.",
    }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("userId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "removeContentContributor", null);
__decorate([
    (0, common_1.Post)(":id/versions"),
    (0, swagger_1.ApiOperation)({ summary: "Create a new version of a document." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, dtos_1.CreateDocumentVersionDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createNewVersion", null);
__decorate([
    (0, common_1.Get)(":id/versions/:versionId/content"),
    (0, swagger_1.ApiOperation)({
        summary: "Get the file or editor content of a document version.",
    }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("versionId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getVersionContent", null);
__decorate([
    (0, common_1.Post)(":id/versions/:versionId/upload-file"),
    (0, swagger_1.ApiOperation)({ summary: "Upload a file for a document version." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("versionId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, dtos_1.CreateDocumentVersionDto,
        Array]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "uploadVersionFile", null);
__decorate([
    (0, common_1.Put)(":id/versions/:versionId/review-comments"),
    (0, swagger_1.ApiOperation)({ summary: "Save review comments on a document version." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["read"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("versionId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "saveVersionReviewComments", null);
__decorate([
    (0, common_1.Put)(":id/versions/:versionId/editor-content"),
    (0, swagger_1.ApiOperation)({ summary: "Save editor content for a document version." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file")),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("versionId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.Body)()),
    __param(5, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, dtos_1.UploadVersionEditorContentDto, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "uploadVersionEditorContent", null);
__decorate([
    (0, common_1.Put)(":id/versions/:versionId/checklist"),
    (0, swagger_1.ApiOperation)({ summary: "Save the checklist for a document version." }),
    (0, permission_decorator_1.hasPermission)({ subject: permissions_1.DocumentPermission.subject, actions: ["update"] }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("versionId")),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, dtos_1.UploadVersionChecklistDto]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "uploadVersionChecklist", null);
exports.DocumentController = DocumentController = DocumentController_1 = __decorate([
    (0, swagger_1.ApiTags)("Documents"),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)("documents"),
    __metadata("design:paramtypes", [typeof (_a = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _a : Object, agent_rules_service_1.AgentRulesService])
], DocumentController);
//# sourceMappingURL=document.controller.js.map