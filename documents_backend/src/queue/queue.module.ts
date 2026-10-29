import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { delay, Events } from './queue-constants';
import { QueuePublisher } from './queue.publisher';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      exchanges: [
        {
          name: 'exchange1',
          type: 'direct',
        },
      ],

      uri: process.env.RABBIT_HOST || 'amqp://guest:guest@127.0.0.1:5672',
      connectionInitOptions: {
        wait: process.env.RABBIT_WAIT == 'true' || false,
      },
      defaultRpcTimeout: 60 * 1000,
      connectionManagerOptions: {
        reconnectTimeInSeconds: 5,
        connectionOptions: {
          timeout: 30 * 1000,
        },
      },
    }),
  ],
  providers: [QueuePublisher],
  exports: [QueuePublisher],
})
export class QueueModule {
  constructor(private readonly producer: QueuePublisher) {}

  async onModuleInit() {
    await delay(500);
    await this.producer.createQueue(Events.EMAIL_SENDING);
    await this.producer.createQueue(Events.NOTIFICATION);
    await this.producer.createQueue(Events.ADD_PERMISSION);
    await this.producer.createQueue(Events.SEND_SURVEY_EMAILS);
    await this.producer.createQueue(Events.HISTORY_RECORD);
    await this.producer.createQueue(Events.OBJECTIVE_PI_STATUS_SYNC);
    await this.producer.createQueue(Events.DOCUMENT_AI_INDEX);
    await this.producer.createQueue(Events.CLIENT_LLM_USAGE);
  }
}
