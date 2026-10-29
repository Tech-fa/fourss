import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Events, getListening } from '../queue/queue-constants';
import { EmailService } from '../common/email.service';
import { Public } from '../util/constants';
import { type EmailHandlerDTO } from './dto';
@Injectable()
export class EmailHandlerService {
  private readonly logger = new Logger(EmailHandlerService.name);
  constructor(private readonly emailService: EmailService) {}

  @RabbitSubscribe(getListening(Events.EMAIL_SENDING))
  @Public()
  async handleEmailSending(data: EmailHandlerDTO) {
    try {
      await this.emailService.send(
        data.to,
        data.type,
        data.replaceString,
        data.subject,
        data.externalEmail,
      );
      this.logger.log(`Email sent successfully to ${data.to}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }
}
