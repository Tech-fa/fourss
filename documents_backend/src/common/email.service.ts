import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { LocalFileService } from './local-file.service';
import { EmailType } from './dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: LocalFileService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  typeMapper = {
    [EmailType.REGISTRATION]: 'Registration',
    [EmailType.REGISTRATION_PENDING]: 'Registration received',
    [EmailType.REGISTRATION_APPROVED]: 'Account approved',
    [EmailType.ACTIVATION]: 'Activation',
    [EmailType.NOTIFICATION]: '4ES Notification',
    [EmailType.CUSTOM_NOTIFICATION]: '4ES Notification',
    [EmailType.RESET_PASSWORD]: 'Reset Password',
    [EmailType.SURVEY]: 'Survey',
    [EmailType.TRACKER_VERIFICATION]: 'Checklist Verification',
    [EmailType.CLIENT_USER_VERIFICATION]: 'Verification Code',
  };

  async send(
    email: string,
    type: EmailType,
    replaceString: { [key: string]: string },
    subject?: string,
    externalEmail?: string
  ) {
    try {
      if (process.env.NODE_ENV != 'production' ) {
        console.log(replaceString);
        return;
      }
      if (email.includes('@@')) {
        email = email.split('@@')[1];
      }
      let html = await this.fileService.getFile(`emails/${externalEmail || type}.html`);
      Object.entries(replaceString).forEach(([key, value]) => {
        const reg = new RegExp(`@@${key}@@`, 'g');
        html = html.replace(reg, value);
      });
      const fromEmail = this.configService.get<string>('FROM_EMAIL');
      const mail = {
        to: email,
        subject: subject || `4es ${this.typeMapper[type] ?? type}`,
        from: `4es <${fromEmail}>`,
        html,
      };
      const { data, error } = await this.resend.emails.send(mail);
      if (error) {
        throw error;
      }

      this.logger.log(`Email ${type} successfully dispatched to ${mail.to}`);
      return data;
    } catch (error) {
      this.logger.error('Error occured on getting email ', error);
    }
  }
}
