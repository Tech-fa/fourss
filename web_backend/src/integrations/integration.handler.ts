import { Injectable, Logger } from "@nestjs/common";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Events, getListening } from "../queue/queue-constants";
import { Public } from "../util/constants";
import { IntegrationService } from "./integration.service";

@Injectable()
export class IntegrationHandler {
  private readonly logger = new Logger(IntegrationHandler.name);

  constructor(private readonly integrations: IntegrationService) {}

  @RabbitSubscribe(getListening(Events.INTEGRATION_EVENT))
  @Public()
  async handle(data: { integrationId?: string; revisionId?: string; event?: string; payload?: unknown }) {
    try {
      await this.integrations.deliver(data || {});
    } catch (error) {
      this.logger.error("Integration event failed", error instanceof Error ? error.stack : error);
      throw error;
    }
  }
}
