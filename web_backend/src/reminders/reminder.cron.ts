import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReminderService } from './reminder.service';

@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(private readonly reminders: ReminderService) {}

  @Cron('0 8 * * *', { timeZone: 'UTC' })
  async sendConfiguredReminders(): Promise<void> {
    this.logger.log('Starting configured reminder job');
    try {
      const queued = await this.reminders.sendDueReminders();
      this.logger.log(`Queued ${queued} reminder email(s).`);
    } catch (error) {
      this.logger.error(
        'Error in configured reminder cron job',
        error?.stack || error,
      );
    }
  }
}
