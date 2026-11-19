import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditInstance,
  AuditInstanceStatus,
} from '../../audit/entities/audit-instance.entity';
import {
  dedupeRecipients,
  personRecipient,
  REMINDER_SOURCE,
  timestampInWindow,
  type ReminderMatch,
  type ReminderRuleView,
  type ReminderSource,
} from '../reminder.logic';

const ANCHORS = {
  start_date: 'startDate',
  end_date: 'endDate',
} as const;

type AuditLike = {
  id: string;
  status?: string;
  deleted?: boolean;
  startDate?: number | string | null;
  endDate?: number | string | null;
  auditProgramId?: string;
  auditProgram?: { title?: string | null; deleted?: boolean } | null;
  auditTeamMembers?: Array<{
    auditPersonnel?: {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      deleted?: boolean;
    } | null;
  } | null>;
};

export function auditMatches(
  instances: AuditLike[],
  rule: ReminderRuleView,
  from: number,
  to: number,
): ReminderMatch[] {
  const anchor = ANCHORS[rule.anchorKey as keyof typeof ANCHORS];
  if (!anchor) return [];
  const matches: ReminderMatch[] = [];
  for (const instance of instances) {
    if (instance.deleted || instance.auditProgram?.deleted) continue;
    if (!rule.statusKeys.includes(String(instance.status))) continue;
    const anchorAt = timestampInWindow(instance[anchor], from, to);
    if (anchorAt == null) continue;
    const recipients = rule.recipientKeys.includes('team')
      ? dedupeRecipients(
          (instance.auditTeamMembers ?? []).map((member) =>
            personRecipient(member?.auditPersonnel),
          ),
        )
      : [];
    if (!recipients.length) continue;
    matches.push({
      entityId: instance.id,
      title: instance.auditProgram?.title?.trim() || 'Scheduled audit',
      linkPath: `/check/audits/${instance.auditProgramId}/instances/${instance.id}`,
      anchorAt,
      recipients,
    });
  }
  return matches;
}

@Injectable()
export class AuditInstanceReminderSource implements ReminderSource {
  key = REMINDER_SOURCE.auditInstance;
  labelKey = 'reminders.sources.audit_instance';
  emailNoun = 'audit';
  anchors = [
    {
      key: 'start_date',
      labelKey: 'reminders.anchors.start_date',
      emailLabel: 'start date',
    },
    {
      key: 'end_date',
      labelKey: 'reminders.anchors.end_date',
      emailLabel: 'end date',
    },
  ];
  recipients = [{ key: 'team', labelKey: 'reminders.recipients.team' }];
  statuses = [
    { key: AuditInstanceStatus.DRAFT, labelKey: 'reminders.statuses.draft' },
    {
      key: AuditInstanceStatus.SCHEDULED,
      labelKey: 'reminders.statuses.scheduled',
    },
    {
      key: AuditInstanceStatus.IN_PROGRESS,
      labelKey: 'reminders.statuses.in_progress',
    },
    {
      key: AuditInstanceStatus.COMPLETED,
      labelKey: 'reminders.statuses.completed',
    },
    {
      key: AuditInstanceStatus.CANCELLED,
      labelKey: 'reminders.statuses.cancelled',
    },
    {
      key: AuditInstanceStatus.ON_HOLD,
      labelKey: 'reminders.statuses.on_hold',
    },
  ];
  defaultRecipientKeys = ['team'];
  defaultStatusKeys = [AuditInstanceStatus.SCHEDULED];

  constructor(
    @InjectRepository(AuditInstance)
    private readonly auditInstances: Repository<AuditInstance>,
  ) {}

  async findDue(
    rule: ReminderRuleView,
    from: number,
    to: number,
  ): Promise<ReminderMatch[]> {
    const anchor = ANCHORS[rule.anchorKey as keyof typeof ANCHORS];
    if (!anchor || rule.statusKeys.length === 0) return [];
    const rows = await this.auditInstances
      .createQueryBuilder('auditInstance')
      .innerJoinAndSelect('auditInstance.auditProgram', 'auditProgram')
      .leftJoinAndSelect('auditInstance.auditTeamMembers', 'member')
      .leftJoinAndSelect('member.auditPersonnel', 'personnel')
      .where('auditInstance.deleted = :deleted', { deleted: false })
      .andWhere('auditProgram.deleted = :programDeleted', {
        programDeleted: false,
      })
      .andWhere('auditInstance.status IN (:...statuses)', {
        statuses: rule.statusKeys,
      })
      .andWhere(`auditInstance.${anchor} BETWEEN :from AND :to`, { from, to })
      .getMany();
    return auditMatches(rows, rule, from, to);
  }
}
