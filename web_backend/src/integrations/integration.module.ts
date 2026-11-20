import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "../common/common.module";
import { QueueModule } from "../queue/queue.module";
import { IntegrationFailure } from "./integration-failure.entity";
import { IntegrationLease } from "./integration-lease.entity";
import { IntegrationSchedule } from "./integration-schedule.entity";
import { IntegrationSubscription } from "./integration-subscription.entity";
import { IntegrationRevision } from "./integration-revision.entity";
import { IntegrationState } from "./integration-state.entity";
import { IntegrationStepProgress } from "./integration-step-progress.entity";
import { IntegrationValue } from "./integration-value.entity";
import { IntegrationController } from "./integration.controller";
import { IntegrationCronService } from "./integration.cron";
import { Integration } from "./integration.entity";
import { IntegrationHandler } from "./integration.handler";
import { IntegrationService } from "./integration.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      IntegrationRevision,
      IntegrationValue,
      IntegrationState,
      IntegrationStepProgress,
      IntegrationFailure,
      IntegrationLease,
      IntegrationSchedule,
      IntegrationSubscription,
    ]),
    QueueModule,
    CommonModule,
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService, IntegrationCronService, IntegrationHandler],
  exports: [IntegrationService],
})
export class IntegrationModule {}
