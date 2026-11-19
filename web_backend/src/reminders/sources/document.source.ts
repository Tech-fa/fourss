import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../document/document.entity';
import { DocumentStatus } from '../../document/document.enums';
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

const ANCHORS = {
  due_date: 'dueDate',
  approval_due_date: 'approvalDueDate',
} as const;

type DocumentLike = {
  id: string;
  title?: string | null;
  deleted?: boolean;
  currentVersion?: number;
  dueDate?: number | string | null;
  approvalDueDate?: number | string | null;
  createdBy?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  contributors?: Array<{
    user?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
  } | null>;
  approvalStrategy?: {
    documentApprovers?: Array<{
      user?: { email?: string | null; fname?: string | null; lname?: string | null } | null;
    } | null>;
  } | null;
  versions?: Array<{ versionNumber?: number; status?: string } | null>;
};

function currentStatus(record: DocumentLike): string | undefined {
  const version = (record.versions ?? []).find(
    (item) => item && item.versionNumber === record.currentVersion,
  );
  return version?.status ?? record.versions?.[0]?.status;
}

function recipientsFor(
  record: DocumentLike,
  keys: string[],
): ReminderRecipient[] {
  const people: Array<ReminderRecipient | null> = [];
  if (keys.includes('creator')) people.push(personRecipient(record.createdBy));
  if (keys.includes('contributors')) {
    for (const contributor of record.contributors ?? []) {
      people.push(personRecipient(contributor?.user));
    }
  }
  if (keys.includes('approvers')) {
    for (const approver of record.approvalStrategy?.documentApprovers ?? []) {
      people.push(personRecipient(approver?.user));
    }
  }
  return dedupeRecipients(people);
}

export function documentMatches(
  records: DocumentLike[],
  rule: ReminderRuleView,
  from: number,
  to: number,
): ReminderMatch[] {
  const anchor = ANCHORS[rule.anchorKey as keyof typeof ANCHORS];
  if (!anchor) return [];
  const matches: ReminderMatch[] = [];
  for (const record of records) {
    if (record.deleted) continue;
    const status = currentStatus(record);
    if (!status || !rule.statusKeys.includes(status)) continue;
    const anchorAt = timestampInWindow(record[anchor], from, to);
    if (anchorAt == null) continue;
    const recipients = recipientsFor(record, rule.recipientKeys);
    if (!recipients.length) continue;
    matches.push({
      entityId: record.id,
      title: record.title?.trim() || 'Document',
      linkPath: `/plan/documents/${record.id}`,
      anchorAt,
      recipients,
    });
  }
  return matches;
}

@Injectable()
export class DocumentReminderSource implements ReminderSource {
  key = REMINDER_SOURCE.document;
  labelKey = 'reminders.sources.document';
  emailNoun = 'document';
  anchors = [
    {
      key: 'due_date',
      labelKey: 'reminders.anchors.due_date',
      emailLabel: 'due date',
    },
    {
      key: 'approval_due_date',
      labelKey: 'reminders.anchors.approval_due_date',
      emailLabel: 'approval due date',
    },
  ];
  recipients = [
    { key: 'creator', labelKey: 'reminders.recipients.creator' },
    { key: 'contributors', labelKey: 'reminders.recipients.contributors' },
    { key: 'approvers', labelKey: 'reminders.recipients.approvers' },
  ];
  statuses = [
    { key: DocumentStatus.VALID, labelKey: 'reminders.statuses.valid' },
    { key: DocumentStatus.INVALID, labelKey: 'reminders.statuses.invalid' },
    { key: DocumentStatus.PENDING, labelKey: 'reminders.statuses.pending' },
    {
      key: DocumentStatus.READY_FOR_APPROVAL,
      labelKey: 'reminders.statuses.ready_for_approval',
    },
    { key: DocumentStatus.PUBLISHED, labelKey: 'reminders.statuses.published' },
    { key: DocumentStatus.IN_REVIEW, labelKey: 'reminders.statuses.in_review' },
    { key: DocumentStatus.OBSOLETE, labelKey: 'reminders.statuses.obsolete' },
  ];
  defaultRecipientKeys = ['creator'];
  defaultStatusKeys = [
    DocumentStatus.VALID,
    DocumentStatus.INVALID,
    DocumentStatus.PENDING,
    DocumentStatus.READY_FOR_APPROVAL,
    DocumentStatus.PUBLISHED,
    DocumentStatus.IN_REVIEW,
  ];

  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
  ) {}

  async findDue(
    rule: ReminderRuleView,
    from: number,
    to: number,
  ): Promise<ReminderMatch[]> {
    const anchor = ANCHORS[rule.anchorKey as keyof typeof ANCHORS];
    if (!anchor || rule.statusKeys.length === 0) return [];
    const rows = await this.documents
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.contributors', 'contributor')
      .leftJoinAndSelect('contributor.user', 'contributorUser')
      .leftJoinAndSelect('document.approvalStrategy', 'strategy')
      .leftJoinAndSelect('strategy.documentApprovers', 'approver')
      .leftJoinAndSelect('approver.user', 'approverUser')
      .innerJoinAndSelect(
        'document.versions',
        'version',
        'version.versionNumber = document.currentVersion',
      )
      .where('document.deleted = :deleted', { deleted: false })
      .andWhere('version.status IN (:...statuses)', { statuses: rule.statusKeys })
      .andWhere(`document.${anchor} BETWEEN :from AND :to`, { from, to })
      .getMany();
    return documentMatches(rows, rule, from, to);
  }
}
