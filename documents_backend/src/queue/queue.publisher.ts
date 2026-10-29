import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { Events, getQueueName, getRouteName } from "./queue-constants";
import { EmailType } from "../common/dto";
import { EmailHandlerDTO } from "../email-handler/dto";

@Injectable()
export class QueuePublisher {
  constructor(private readonly queue: AmqpConnection) {}

  public createQueue(event: Events) {
    this.queue.channel.assertQueue(getQueueName(event), {
      durable: true,
    });
    this.queue.channel.bindQueue(
      getQueueName(event),
      "exchange1",
      getRouteName(event),
    );
  }

  public sendEmail(data: {
    to: string;
    type: EmailType;
    replaceString: any;
    subject?: string;
    externalEmail?: string;
  }) {
    this.publish(Events.EMAIL_SENDING, data);
  }
  public addPermission(data: {
    userId: string;
    teamId: number;
    action: "created" | "deleted";
    clientId: string;
    isMember?: boolean;
  }) {
    this.publish(Events.ADD_PERMISSION, data);
  }

  public sendSurveyEmails(data: { surveyId: string }) {
    console.log("Publishing survey email event:", data);
    this.publish(Events.SEND_SURVEY_EMAILS, data);
  }

  public recordHistory(data: {
    entityName: string;
    entityId: string;
    oldValues: any;
    newValues: any;
    action: "CREATE" | "UPDATE" | "DELETE";
    user: any;
  }) {
    this.publish(Events.HISTORY_RECORD, data);
  }

  public syncObjectivesFromPi(data: {
    performanceIndicatorId: string;
    clientId: string;
  }) {
    this.publish(Events.OBJECTIVE_PI_STATUS_SYNC, data);
  }

  public indexDocumentForAi(data: { documentId: string; versionId: number }) {
    return this.publish(Events.DOCUMENT_AI_INDEX, data);
  }

  public recordClientLlmUsage(data: {
    clientId: string;
    usage: {
      promptTokens: number | null;
      completionTokens: number | null;
      totalTokens: number | null;
    };
  }) {
    this.publish(Events.CLIENT_LLM_USAGE, data);
  }

  async publish(event: Events, data) {
    this.queue.publish("exchange1", getRouteName(event), data);
  }
  async publishEmail(data: EmailHandlerDTO) {
    this.queue.publish("exchange1", getRouteName(Events.EMAIL_SENDING), data);
  }
}
