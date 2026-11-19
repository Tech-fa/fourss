import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRole } from './entities/audit-role.entity';
import { AuditDocumentType } from './entities/document-type.entity';
import { AuditActivityType } from './entities/audit-activity-type.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { UsersModule } from '../user/user.module';
import { User } from '../user/user.entity';
import { TeamModule } from '../teams/team.module';
import { CommonModule } from '../common/common.module';
import { PermissionModule } from '../permissions/permission.module';
import { AuditPersonnel } from './entities/audit-personnel.entity';
import { AuditProgram } from './entities/audit-program.entity';
import { ChecklistDefinition } from './entities/checklist-definition.entity';
import { ChecklistDefinitionVersion } from './entities/checklist-definition-version.entity';
import { ChecklistSectionDefinition } from './entities/checklist-section-definition.entity';
import { ChecklistQuestionDefinition } from './entities/checklist-question-definition.entity';
import { AuditInstance } from './entities/audit-instance.entity';
import { AuditInstanceAttachment } from './entities/audit-instance-attachment.entity';
import { File } from '../common/file.entity';
import { AuditInstanceChecklistVersion } from './entities/audit-instance-checklist-versions.entity';
import { AuditTeamMember } from './entities/audit-team-member.entity';
import { AuditReport } from './entities/audit-report.entity';
import { AuditChecklistResponse } from './entities/audit-checklist-response.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditFindingEvidence } from './entities/audit-finding-evidence.entity';
import { DocumentModule } from '../document/document.module';
import { ChecklistDefinitionTeam } from './entities/checklist-definition-team.entity';
import { QueueModule } from '../queue/queue.module';
import { AuditProgramScheduleEntry } from './entities/audit-program-schedule-entry.entity';
import { AuditProgramStandard } from './entities/audit-program-standard.entity';
import { Standard } from './entities/standard.entity';
import { StandardImplementation } from '../standards/standard-implementation.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditRole,
      AuditPersonnel,
      User,
      AuditDocumentType,
      AuditActivityType,
      AuditProgram,
      AuditInstance,
      AuditInstanceAttachment,
      File,
      AuditInstanceChecklistVersion,
      AuditTeamMember,
      AuditReport,
      ChecklistDefinition,
      ChecklistDefinitionVersion,
      ChecklistSectionDefinition,
      ChecklistQuestionDefinition,
      AuditChecklistResponse,
      AuditFinding,
      AuditFindingEvidence,
      ChecklistDefinitionTeam,
      AuditProgramScheduleEntry,
      AuditProgramStandard,
      Standard,
      StandardImplementation,
    ]),
    UsersModule,
    TeamModule,
    CommonModule,
    PermissionModule,
    DocumentModule,
    QueueModule,
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
