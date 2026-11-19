import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NCStatus,
  NonConformity,
} from '../../non-conformities/entities/non-conformity.entity';
import {
  dedupeRecipients,
  personRecipient,
  REMINDER_SOURCE,
  timestampInWindow,
  type ReminderMatch,
  type ReminderRecipient,
  type ReminderRuleView,
  type ReminderSource,
} from '../reminder.logic';

type NonConformityLike = {
  id: string;
  name?: string | null;
  status?: string;
  deleted?: boolean;
  dueDate?: number | string | null;
  responsibleUser?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  createdBy?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  internalRepresentative?: {
    email?: string | null;
    fname?: string | null;
    lname?: string | null;
  } | null;
  representative?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    deleted?: boolean;
  } | null;
};

function recipientsFor(
  record: NonConformityLike,
  keys: string[],
): ReminderRecipient[] {
  const people: Array<ReminderRecipient | null> = [];
  if (keys.includes('responsible_user')) {
    people.push(personRecipient(record.responsibleUser));
  }
  if (keys.includes('creator')) people.push(personRecipient(record.createdBy));
  if (keys.includes('internal_representative')) {
    people.push(personRecipient(record.internalRepresentative));
  }
  if (keys.includes('external_representative')) {
    people.push(personRecipient(record.representative));
  }
  return dedupeRecipients(people);
}

export function nonConformityMatches(
  records: NonConformityLike[],
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
    const recipients = recipientsFor(record, rule.recipientKeys);
    if (!recipients.length) continue;
    matches.push({
      entityId: record.id,
      title: record.name?.trim() || 'Non-conformity',
      linkPath: `/act/non-conformities/${record.id}`,
      anchorAt,
      recipients,
    });
  }
  return matches;
}

@Injectable()
export class NonConformityReminderSource implements ReminderSource {
  key = REMINDER_SOURCE.nonConformity;
  labelKey = 'reminders.sources.non_conformity';
  emailNoun = 'non-conformity';
  anchors = [
    {
      key: 'due_date',
      labelKey: 'reminders.anchors.due_date',
      emailLabel: 'due date',
    },
  ];
  recipients = [
    {
      key: 'responsible_user',
      labelKey: 'reminders.recipients.responsible_user',
    },
    { key: 'creator', labelKey: 'reminders.recipients.creator' },
    {
      key: 'internal_representative',
      labelKey: 'reminders.recipients.internal_representative',
    },
    {
      key: 'external_representative',
      labelKey: 'reminders.recipients.external_representative',
    },
  ];
  statuses = [
    { key: NCStatus.OPEN, labelKey: 'reminders.statuses.open' },
    { key: NCStatus.CLOSED, labelKey: 'reminders.statuses.closed' },
  ];
  defaultRecipientKeys = ['responsible_user'];
  defaultStatusKeys = [NCStatus.OPEN];

  constructor(
    @InjectRepository(NonConformity)
    private readonly nonConformities: Repository<NonConformity>,
  ) {}

  async findDue(
    rule: ReminderRuleView,
    from: number,
    to: number,
  ): Promise<ReminderMatch[]> {
    if (rule.anchorKey !== 'due_date' || rule.statusKeys.length === 0) return [];
    const rows = await this.nonConformities
      .createQueryBuilder('nc')
      .leftJoinAndSelect('nc.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('nc.createdBy', 'createdBy')
      .leftJoinAndSelect('nc.internalRepresentative', 'internalRepresentative')
      .leftJoinAndSelect('nc.representative', 'representative')
      .where('nc.deleted = :deleted', { deleted: false })
      .andWhere('nc.status IN (:...statuses)', { statuses: rule.statusKeys })
      .andWhere('nc.dueDate BETWEEN :from AND :to', { from, to })
      .getMany();
    return nonConformityMatches(rows, rule, from, to);
  }
}
