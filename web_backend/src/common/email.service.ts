import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Resend } from 'resend';
import { EmailType } from './dto';

const EMAIL_DIR = join(__dirname, 'emails');

function templatePath(name: string): string {
  if (!/^[a-z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid email template name: ${name}`);
  }
  return join(EMAIL_DIR, `${name}.html`);
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  typeMapper = {
    [EmailType.REGISTRATION]: 'Registration',
    [EmailType.ACTIVATION]: 'Activation',
    [EmailType.NOTIFICATION]: '4SS Notification',
    [EmailType.RESET_PASSWORD]: 'Reset Password',
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
      const html = await this.renderTemplate(
        externalEmail || type,
        replaceString,
      );
      const fromEmail = this.configService.get<string>('FROM_EMAIL');
      const mail = {
        to: email,
        subject: subject || `4SS ${this.typeMapper[type] ?? type}`,
        from: `4SS <${fromEmail}>`,
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

  async sendHtml(
    email: string,
    subject: string,
    html: string,
    devLog?: { [key: string]: string },
  ): Promise<boolean> {
    try {
      if (process.env.NODE_ENV != 'production') {
        console.log(devLog ?? { subject, to: email });
        return true;
      }
      if (email.includes('@@')) {
        email = email.split('@@')[1];
      }
      const fromEmail = this.configService.get<string>('FROM_EMAIL');
      const { error } = await this.resend.emails.send({
        to: email,
        subject,
        from: `4SS <${fromEmail}>`,
        html,
      });
      if (error) {
        throw error;
      }
      this.logger.log(`Email successfully dispatched to ${email}`);
      return true;
    } catch (error) {
      this.logger.error('Error occured on sending email', error);
      return false;
    }
  }

  private async renderTemplate(
    name: string,
    replaceString: { [key: string]: string },
  ): Promise<string> {
    let html = await readFile(templatePath(name), 'utf8');
    Object.entries(replaceString).forEach(([key, value]) => {
      if (!/^[A-Za-z0-9_]+$/.test(key)) {
        return;
      }
      html = html.replace(new RegExp(`@@${key}@@`, 'g'), value ?? '');
    });
    return html;
  }
}
