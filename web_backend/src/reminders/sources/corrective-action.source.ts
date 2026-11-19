import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NCCorrectiveAction,
  NCCorrectiveActionStatus,
} from '../../non-conformities/entities/nc-corrective-action.entity';
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
  title?: string | null;
  status?: string;
  deleted?: boolean;
  dueDate?: number | string | null;
  nonConformityId?: string;
  assignedTo?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  verifiedBy?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
};

export function correctiveActionMatches(
  records: ActionLike[],
  rule: ReminderRuleView,
  from: number,
  to: number,
): ReminderMatch[] {
  if (rule.anchorKey !== 'due_date') return [];
  const matches: ReminderMatch[] = [];
  for (const record of records) {
    if (record.deleted) continue;
    if (!rule.statusKeys.includes(String(record.status))) continue;
    const anchorAt = timestampInWindow(record.dueDate, from, to);
    if (anchorAt == null) continue;
    const recipients = dedupeRecipients([
      rule.recipientKeys.includes('assignee')
        ? personRecipient(record.assignedTo)
        : null,
      rule.recipientKeys.includes('verifier')
        ? personRecipient(record.verifiedBy)
        : null,
    ]);
    if (!recipients.length) continue;
    matches.push({
      entityId: record.id,
      title: record.title?.trim() || 'Corrective action',
      linkPath: `/act/non-conformities/${record.nonConformityId}/corrective-actions/${record.id}`,
      anchorAt,
      recipients,
    });
  }
  return matches;
}

@Injectable()
export class CorrectiveActionReminderSource implements ReminderSource {
  key = REMINDER_SOURCE.correctiveAction;
  labelKey = 'reminders.sources.corrective_action';
  emailNoun = 'corrective action';
  anchors = [
    {
      key: 'due_date',
      labelKey: 'reminders.anchors.due_date',
      emailLabel: 'due date',
    },
  ];
  recipients = [
    { key: 'assignee', labelKey: 'reminders.recipients.assignee' },
    { key: 'verifier', labelKey: 'reminders.recipients.verifier' },
  ];
  statuses = [
    { key: NCCorrectiveActionStatus.OPEN, labelKey: 'reminders.statuses.open' },
    {
      key: NCCorrectiveActionStatus.APPLIED,
      labelKey: 'reminders.statuses.applied',
    },
    {
      key: NCCorrectiveActionStatus.VERIFIED,
      labelKey: 'reminders.statuses.verified',
    },
    {
      key: NCCorrectiveActionStatus.CLOSED,
      labelKey: 'reminders.statuses.closed',
    },
  ];
  defaultRecipientKeys = ['assignee'];
  defaultStatusKeys = [NCCorrectiveActionStatus.OPEN];

  constructor(
    @InjectRepository(NCCorrectiveAction)
    private readonly actions: Repository<NCCorrectiveAction>,
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
      .leftJoinAndSelect('action.verifiedBy', 'verifiedBy')
      .where('action.deleted = :deleted', { deleted: false })
      .andWhere('action.status IN (:...statuses)', { statuses: rule.statusKeys })
      .andWhere('action.dueDate BETWEEN :from AND :to', { from, to })
      .getMany();
    return correctiveActionMatches(rows, rule, from, to);
  }
}
