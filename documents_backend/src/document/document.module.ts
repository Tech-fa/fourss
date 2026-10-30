import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document } from "./document.entity";
import { DocumentType } from "./document-type.entity";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { DocumentVersion } from "./document-version.entity";
import { Team } from "../teams/team.entity";
import { ApprovalStrategy } from "./approval-strategy.entity";
import { DocumentAcknowledgement } from "./document-acknowledgement.entity";
import { DocumentAcknowledgementUnit } from "./document-acknowledgement-unit.entity";
import { DocumentAcknowledgementUser } from "./document-acknowledgement-user.entity";
import { UsersModule } from "../user/user.module";
import { TeamModule } from "../teams/team.module";
import { CommonModule } from "../common/common.module";
import { DocumentApprover } from "./document-approver.entity";
import { DocumentContributor } from "./document-contributor.entity";
import { DocumentContentContributor } from "./document-content-contributor.entity";
import { DocumentAction } from "./document-action.entity";
import { ChangeRequest } from "./change-request.entity";
import { ChangeRequestDocument } from "./change-request-document.entity";
import { HistoryModule } from "../history/history.module";
import { QueueModule } from "../queue/queue.module";
import { PermissionModule } from "../permissions/permission.module";
import { DocumentCronService } from "./document-cron";
import { DocumentTemplate } from "./document-template.entity";
import { DocumentDraft } from "./document-draft.entity";
import { TeamMember } from "../teams/team-member.entity";
import { DocumentChecklist } from "./document-checklist.entity";
import { DocumentChecklistQuestion } from "./document-checklist-question.entity";
import { DocumentAiSource } from "./document-ai-source.entity";
import { DocumentAiIndexService } from "./document-ai-index.service";
import { AgentRulesService } from "./agent-rules.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentType,
      DocumentVersion,
      Team,
      ApprovalStrategy,
      DocumentAcknowledgement,
      DocumentAcknowledgementUnit,
      DocumentAcknowledgementUser,
      DocumentApprover,
      DocumentContributor,
      DocumentContentContributor,
      DocumentAction,
      ChangeRequest,
      ChangeRequestDocument,
      DocumentTemplate,
      DocumentDraft,
      TeamMember,
      DocumentChecklist,
      DocumentChecklistQuestion,
      DocumentAiSource,
    ]),
    UsersModule,
    TeamModule,
    CommonModule,
    QueueModule,
    PermissionModule,
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    DocumentCronService,
    DocumentAiIndexService,
    AgentRulesService,
  ],
  exports: [DocumentService, DocumentAiIndexService],
})
export class DocumentModule {}
