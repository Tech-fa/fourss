import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NonConformityController } from './non-conformity.controller';
import { NonConformityService } from './non-conformity.service';
import { Category } from './entities/category.entity';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { NCCustomFieldValue } from './entities/nc-custom-field-value.entity';
import { PermissionModule } from '../permissions/permission.module';
import { TeamModule } from '../teams/team.module';
import { Team } from '../teams/team.entity';
import { TeamMember } from '../teams/team-member.entity';
import { Document } from '../document/document.entity';
import { NonConformityType } from './entities/non-conformity-type.entity';
import { NonConformityRiskLevel } from './entities/non-conformity-risk-level.entity';
import { NonConformity } from './entities/non-conformity.entity';
import { NcDueDateAmendment } from './entities/nc-due-date-amendment.entity';
import { CommonModule } from '../common/common.module';
import { NonConformityRepresentative } from './entities/non-conformity-representative.entity';
import { NCCorrectiveAction } from './entities/nc-corrective-action.entity';
import { CaChangeRequest } from './entities/ca_change_request.entity';
import { ImmediateAction } from "../common/immediate-action.entity";
import { ImmediateActionEvidence } from "../common/evidence.entity";
import { ImmediateActionComment } from "../common/immediate-action-comment.entity";
import { ImmediateActionCommonService } from "../common/immediate-action-common.service";
import { Evidence } from "./entities/evidence.entity";
import { RootCauseAnalysis } from "./entities/root-cause-analysis.entity";
import { Investigation } from "./entities/investigation.entity";
import { InvestigationEvidence } from "./entities/investigation-evidence.entity";
import { UsersModule } from "../user/user.module";
import { QueueModule } from "../queue/queue.module";
import { CaEffectivenessEvidence } from './entities/ca-effectiveness-evidence.entity';
import { RCAFiveWhyStep } from './entities/rca-fivewhy-step.entity';
import { RCACeCategory } from './entities/rca-ce-category.entity';
import { RCACeCause } from './entities/rca-ce-cause.entity';
import { RCAFishbone } from './entities/rca-fishbone.entity';
import { NCCorrectiveActionCauses } from './entities/nc-corrective-action-causes.entity';
import { RootCauseAnalysisPerformer } from './entities/root-cause-analysis-performer.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      CategoryCustomField,
      NCCustomFieldValue,
      NonConformityType,
      NonConformityRiskLevel,
      NonConformity,
      NcDueDateAmendment,
      NonConformityRepresentative,
      NCCorrectiveAction,
      NCCorrectiveActionCauses,
      CaChangeRequest,
      ImmediateAction,
      ImmediateActionEvidence,
      ImmediateActionComment,
      Evidence,
      CaEffectivenessEvidence,
      InvestigationEvidence,
      RootCauseAnalysis,
      RootCauseAnalysisPerformer,
      Investigation,
      RCAFiveWhyStep,
      RCACeCategory,
      RCACeCause,
      RCAFishbone,
      User,
      Team,
      TeamMember,
      Document,
    ]),
    TeamModule,
    PermissionModule,
    CommonModule,
    UsersModule,
    QueueModule,
    ],
    controllers: [NonConformityController],
    providers: [NonConformityService, ImmediateActionCommonService],
    exports: [NonConformityService],
})
export class NonConformityModule {}
