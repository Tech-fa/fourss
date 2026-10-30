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
var DocumentCronService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const document_entity_1 = require("./document.entity");
const document_service_1 = require("./document.service");
let DocumentCronService = DocumentCronService_1 = class DocumentCronService {
    documentRepository;
    documentService;
    logger = new common_1.Logger(DocumentCronService_1.name);
    constructor(documentRepository, documentService) {
        this.documentRepository = documentRepository;
        this.documentService = documentService;
    }
    async createNewVersionOfDocuments() {
        this.logger.log('Starting document new version creation cron job at midnight');
        try {
            const affected = await this.documentService.createNewVersionOfDocuments();
            this.logger.log(`Created ${affected} new version(s) of document(s).`);
        }
        catch (error) {
            this.logger.error('Error in document new version creation cron job', error?.stack || error);
        }
    }
    async expireDocumentsPastDueDate() {
        this.logger.log('Starting document expiry check cron job at midnight');
        try {
            const affected = await this.documentService.expireDocumentsPastDueDate();
            this.logger.log(`Expired ${affected} document(s).`);
        }
        catch (error) {
            this.logger.error('Error in document expiry cron job', error?.stack || error);
        }
    }
};
exports.DocumentCronService = DocumentCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DocumentCronService.prototype, "createNewVersionOfDocuments", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DocumentCronService.prototype, "expireDocumentsPastDueDate", null);
exports.DocumentCronService = DocumentCronService = DocumentCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(document_entity_1.Document)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof document_service_1.DocumentService !== "undefined" && document_service_1.DocumentService) === "function" ? _a : Object])
], DocumentCronService);
//# sourceMappingURL=document-cron.js.map