import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditInstance } from '../audit/entities/audit-instance.entity';
import { ImmediateAction } from '../common/immediate-action.entity';
import { Document } from '../document/document.entity';
import { NCCorrectiveAction } from '../non-conformities/entities/nc-corrective-action.entity';
import { NonConformity } from '../non-conformities/entities/non-conformity.entity';
import { QueueModule } from '../queue/queue.module';
import { ReminderController } from './reminder.controller';
import { ReminderCronService } from './reminder.cron';
import { ReminderDelivery } from './reminder-delivery.entity';
import { ReminderRule } from './reminder-rule.entity';
import { REMINDER_SOURCES, ReminderService } from './reminder.service';
import { AuditInstanceReminderSource } from './sources/audit-instance.source';
import { CorrectiveActionReminderSource } from './sources/corrective-action.source';
import { DocumentReminderSource } from './sources/document.source';
import { ImmediateActionReminderSource } from './sources/immediate-action.source';
import { NonConformityReminderSource } from './sources/non-conformity.source';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReminderRule,
      ReminderDelivery,
      AuditInstance,
      NonConformity,
      NCCorrectiveAction,
      ImmediateAction,
      Document,
    ]),
    QueueModule,
  ],
  controllers: [ReminderController],
  providers: [
    AuditInstanceReminderSource,
    NonConformityReminderSource,
    CorrectiveActionReminderSource,
    ImmediateActionReminderSource,
    DocumentReminderSource,
    {
      provide: REMINDER_SOURCES,
      useFactory: (
        audits: AuditInstanceReminderSource,
        nonConformities: NonConformityReminderSource,
        correctiveActions: CorrectiveActionReminderSource,
        immediateActions: ImmediateActionReminderSource,
        documents: DocumentReminderSource,
      ) => [
        audits,
        nonConformities,
        correctiveActions,
        immediateActions,
        documents,
      ],
      inject: [
        AuditInstanceReminderSource,
        NonConformityReminderSource,
        CorrectiveActionReminderSource,
        ImmediateActionReminderSource,
        DocumentReminderSource,
      ],
    },
    ReminderService,
    ReminderCronService,
  ],
})
export class RemindersModule {}
