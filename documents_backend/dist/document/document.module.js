"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const document_entity_1 = require("./document.entity");
const document_type_entity_1 = require("./document-type.entity");
const document_controller_1 = require("./document.controller");
const document_service_1 = require("./document.service");
const document_version_entity_1 = require("./document-version.entity");
const team_entity_1 = require("../teams/team.entity");
const approval_strategy_entity_1 = require("./approval-strategy.entity");
const document_acknowledgement_entity_1 = require("./document-acknowledgement.entity");
const document_acknowledgement_unit_entity_1 = require("./document-acknowledgement-unit.entity");
const document_acknowledgement_user_entity_1 = require("./document-acknowledgement-user.entity");
const user_module_1 = require("../user/user.module");
const team_module_1 = require("../teams/team.module");
const common_module_1 = require("../common/common.module");
const document_approver_entity_1 = require("./document-approver.entity");
const document_contributor_entity_1 = require("./document-contributor.entity");
const document_content_contributor_entity_1 = require("./document-content-contributor.entity");
const document_action_entity_1 = require("./document-action.entity");
const change_request_entity_1 = require("./change-request.entity");
const change_request_document_entity_1 = require("./change-request-document.entity");
const queue_module_1 = require("../queue/queue.module");
const permission_module_1 = require("../permissions/permission.module");
const document_cron_1 = require("./document-cron");
const document_template_entity_1 = require("./document-template.entity");
const document_draft_entity_1 = require("./document-draft.entity");
const team_member_entity_1 = require("../teams/team-member.entity");
const document_checklist_entity_1 = require("./document-checklist.entity");
const document_checklist_question_entity_1 = require("./document-checklist-question.entity");
const document_ai_source_entity_1 = require("./document-ai-source.entity");
const document_ai_index_service_1 = require("./document-ai-index.service");
const agent_rules_service_1 = require("./agent-rules.service");
let DocumentModule = class DocumentModule {
};
exports.DocumentModule = DocumentModule;
exports.DocumentModule = DocumentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                document_entity_1.Document,
                document_type_entity_1.DocumentType,
                document_version_entity_1.DocumentVersion,
                team_entity_1.Team,
                approval_strategy_entity_1.ApprovalStrategy,
                document_acknowledgement_entity_1.DocumentAcknowledgement,
                document_acknowledgement_unit_entity_1.DocumentAcknowledgementUnit,
                document_acknowledgement_user_entity_1.DocumentAcknowledgementUser,
                document_approver_entity_1.DocumentApprover,
                document_contributor_entity_1.DocumentContributor,
                document_content_contributor_entity_1.DocumentContentContributor,
                document_action_entity_1.DocumentAction,
                change_request_entity_1.ChangeRequest,
                change_request_document_entity_1.ChangeRequestDocument,
                document_template_entity_1.DocumentTemplate,
                document_draft_entity_1.DocumentDraft,
                team_member_entity_1.TeamMember,
                document_checklist_entity_1.DocumentChecklist,
                document_checklist_question_entity_1.DocumentChecklistQuestion,
                document_ai_source_entity_1.DocumentAiSource,
            ]),
            user_module_1.UsersModule,
            team_module_1.TeamModule,
            common_module_1.CommonModule,
            queue_module_1.QueueModule,
            permission_module_1.PermissionModule,
        ],
        controllers: [document_controller_1.DocumentController],
        providers: [
            document_service_1.DocumentService,
            document_cron_1.DocumentCronService,
            document_ai_index_service_1.DocumentAiIndexService,
            agent_rules_service_1.AgentRulesService,
        ],
        exports: [document_service_1.DocumentService, document_ai_index_service_1.DocumentAiIndexService],
    })
], DocumentModule);
//# sourceMappingURL=document.module.js.map