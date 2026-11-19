import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IntegrationService } from "./integration.service";

@Injectable()
export class IntegrationCronService {
  private readonly logger = new Logger(IntegrationCronService.name);

  constructor(private readonly integrations: IntegrationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    try {
      await this.integrations.runDueTicks();
      await this.integrations.reconcileTasks();
    } catch (error) {
      this.logger.error("Integration tick failed", error instanceof Error ? error.stack : error);
    }
  }
}
