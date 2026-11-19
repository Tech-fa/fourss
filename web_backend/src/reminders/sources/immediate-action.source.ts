import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ImmediateAction,
  ImmediateActionStatus,
} from '../../common/immediate-action.entity';
import {
  dedupeRecipients,
  personRecipient,
  REMINDER_SOURCE,
  timestampInWindow,
  type ReminderMatch,
  type ReminderRuleView,
  type ReminderSource,
} from '../reminder.logic';

type ActionLike = {
  id: string;
  description?: string | null;
  status?: string;
  dueDate?: number | string | null;
  assignedTo?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  createdBy?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
};

export function immediateActionMatches(
  records: ActionLike[],
  rule: ReminderRuleView,
  from: number,
  to: number,
): ReminderMatch[] {
  if (rule.anchorKey !== 'due_date') return [];
  const matches: ReminderMatch[] = [];
  for (const record of records) {
    if (!rule.statusKeys.includes(String(record.status))) continue;
    const anchorAt = timestampInWindow(record.dueDate, from, to);
    if (anchorAt == null) continue;
    const recipients = dedupeRecipients([
      rule.recipientKeys.includes('assignee')
        ? personRecipient(record.assignedTo)
        : null,
      rule.recipientKeys.includes('creator')
        ? personRecipient(record.createdBy)
        : null,
    ]);
    if (!recipients.length) continue;
    const title = record.description?.trim() || 'Immediate action';
    matches.push({
      entityId: record.id,
      title: title.length > 80 ? `${title.slice(0, 77)}...` : title,
      linkPath: `/tasks/immediate-actions/${record.id}`,
      anchorAt,
      recipients,
    });
  }
  return matches;
}

@Injectable()
export class ImmediateActionReminderSource implements ReminderSource {
  key = REMINDER_SOURCE.immediateAction;
  labelKey = 'reminders.sources.immediate_action';
  emailNoun = 'immediate action';
  anchors = [
    {
      key: 'due_date',
      labelKey: 'reminders.anchors.due_date',
      emailLabel: 'due date',
    },
  ];
  recipients = [
    { key: 'assignee', labelKey: 'reminders.recipients.assignee' },
    { key: 'creator', labelKey: 'reminders.recipients.creator' },
  ];
  statuses = [
    { key: ImmediateActionStatus.OPEN, labelKey: 'reminders.statuses.open' },
    {
      key: ImmediateActionStatus.READY_FOR_VERIFICATION,
      labelKey: 'reminders.statuses.ready_for_verification',
    },
    {
      key: ImmediateActionStatus.VERIFIED,
      labelKey: 'reminders.statuses.verified',
    },
    {
      key: ImmediateActionStatus.REJECTED,
      labelKey: 'reminders.statuses.rejected',
    },
  ];
  defaultRecipientKeys = ['assignee'];
  defaultStatusKeys = [ImmediateActionStatus.OPEN];

  constructor(
    @InjectRepository(ImmediateAction)
    private readonly actions: Repository<ImmediateAction>,
  ) {}

  async findDue(
    rule: ReminderRuleView,
    from: number,
    to: number,
  ): Promise<ReminderMatch[]> {
    if (rule.anchorKey !== 'due_date' || rule.statusKeys.length === 0) return [];
    const rows = await this.actions
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.assignedTo', 'assignedTo')
      .leftJoinAndSelect('action.createdBy', 'createdBy')
      .where('action.status IN (:...statuses)', { statuses: rule.statusKeys })
      .andWhere('action.dueDate BETWEEN :from AND :to', { from, to })
      .getMany();
    return immediateActionMatches(rows, rule, from, to);
  }
}
