import { BadRequestException } from '@nestjs/common';
import { EmailType } from '../common/dto';
import { AuditInstanceStatus } from '../audit/entities/audit-instance.entity';
import { NCStatus } from '../non-conformities/entities/non-conformity.entity';
import { ReminderDelivery } from './reminder-delivery.entity';
import { ReminderRule } from './reminder-rule.entity';
import { ReminderService } from './reminder.service';
import {
  anchorDay,
  anchorWindow,
  DEFAULT_AUDIT_REMINDER_RULE_ID,
} from './reminder.logic';
import { AuditInstanceReminderSource } from './sources/audit-instance.source';
import { NonConformityReminderSource } from './sources/non-conformity.source';

const now = new Date(Date.UTC(2026, 10, 17, 8, 0, 0));
const tomorrowMorning = Date.UTC(2026, 10, 18, 9, 0);

function rowsRepository(rows: unknown[]) {
  const qb: any = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') return undefined;
        if (property === 'getMany') return async () => rows;
        return () => qb;
      },
    },
  );
  return { createQueryBuilder: () => qb };
}

function ruleRepository(seed: ReminderRule[]) {
  const rows = [...seed];
  const find = jest.fn(async (options?: { where?: Record<string, unknown> }) => {
    const where = options?.where ?? {};
    return rows.filter((row) =>
      Object.entries(where).every(([key, value]) => (row as any)[key] === value),
    );
  });
  return {
    rows,
    find,
    findOne: jest.fn(async (options?: { where?: Record<string, unknown> }) => {
      const found = await find(options);
      return found[0] ?? null;
    }),
    create: jest.fn((value: ReminderRule) => value),
    save: jest.fn(async (value: ReminderRule) => {
      const index = rows.findIndex((row) => row.id === value.id);
      if (index >= 0) rows[index] = value;
      else rows.push(value);
      return value;
    }),
  };
}

function deliveryRepository(seed: ReminderDelivery[] = []) {
  const rows = [...seed];
  return {
    rows,
    findOne: jest.fn(async (options?: { where?: Record<string, unknown> }) => {
      const where = options?.where ?? {};
      return (
        rows.find((row) =>
          Object.entries(where).every(
            ([key, value]) => (row as any)[key] === value,
          ),
        ) ?? null
      );
    }),
    insert: jest.fn(async (value: ReminderDelivery) => {
      const duplicate = rows.some(
        (row) =>
          row.ruleId === value.ruleId &&
          row.entityId === value.entityId &&
          row.anchorDay === value.anchorDay,
      );
      if (duplicate) {
        const error: any = new Error('dup');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      rows.push(value);
    }),
  };
}

function auditRule(enabled = true): ReminderRule {
  return {
    id: DEFAULT_AUDIT_REMINDER_RULE_ID,
    sourceKey: 'audit_instance',
    anchorKey: 'start_date',
    offsetDays: 1,
    direction: 'before',
    recipientKeys: ['team'],
    statusKeys: [AuditInstanceStatus.SCHEDULED],
    enabled,
    deleted: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

function serviceFor(input: {
  rules?: ReminderRule[];
  deliveries?: ReminderDelivery[];
  audits?: unknown[];
  nonConformities?: unknown[];
}) {
  const rules = ruleRepository(input.rules ?? []);
  const deliveries = deliveryRepository(input.deliveries ?? []);
  const queuePublisher = { sendEmail: jest.fn() };
  const service = new ReminderService(
    rules as any,
    deliveries as any,
    [
      new AuditInstanceReminderSource(rowsRepository(input.audits ?? []) as any),
      new NonConformityReminderSource(
        rowsRepository(input.nonConformities ?? []) as any,
      ),
    ],
    queuePublisher as any,
  );
  return { service, queuePublisher, deliveries };
}

describe('anchorWindow', () => {
  it('covers the UTC day the offset points at', () => {
    expect(anchorWindow(now, 1, 'before')).toEqual({
      from: Date.UTC(2026, 10, 18),
      to: Date.UTC(2026, 10, 19) - 1,
    });
    expect(anchorDay(Date.UTC(2026, 10, 18))).toBe('2026-11-18');
  });
});

describe('ReminderService.sendDueReminders', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.example.com/';
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('emails the audit team one day before a scheduled start and skips other statuses', async () => {
    const { service, queuePublisher } = serviceFor({
      rules: [auditRule()],
      audits: [
        {
          id: 'instance-1',
          auditProgramId: 'program-1',
          status: AuditInstanceStatus.SCHEDULED,
          deleted: false,
          startDate: tomorrowMorning,
          auditProgram: { title: 'Internal QMS', deleted: false },
          auditTeamMembers: [
            {
              auditPersonnel: {
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@example.com',
                deleted: false,
              },
            },
            {
              auditPersonnel: {
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'Ada@example.com',
                deleted: false,
              },
            },
          ],
        },
        {
          id: 'instance-2',
          auditProgramId: 'program-1',
          status: AuditInstanceStatus.IN_PROGRESS,
          deleted: false,
          startDate: tomorrowMorning,
          auditProgram: { title: 'Internal QMS', deleted: false },
          auditTeamMembers: [
            {
              auditPersonnel: {
                email: 'grace@example.com',
                firstName: 'Grace',
                lastName: 'Hopper',
              },
            },
          ],
        },
      ],
    });

    await expect(service.sendDueReminders(now)).resolves.toBe(1);
    expect(queuePublisher.sendEmail).toHaveBeenCalledTimes(1);
    expect(queuePublisher.sendEmail).toHaveBeenCalledWith({
      to: 'ada@example.com',
      type: EmailType.NOTIFICATION,
      subject: 'Reminder: Internal QMS',
      replaceString: {
        name: 'Ada Lovelace',
        message:
          "Your audit 'Internal QMS' start date is tomorrow (18 Nov 2026, 09:00 UTC)",
        link: 'https://app.example.com/check/audits/program-1/instances/instance-1',
      },
    });
  });

  it('emails the responsible user when a non-conformity due date matches', async () => {
    const { service, queuePublisher } = serviceFor({
      rules: [
        {
          id: 'nc-rule',
          sourceKey: 'non_conformity',
          anchorKey: 'due_date',
          offsetDays: 1,
          direction: 'before',
          recipientKeys: ['responsible_user'],
          statusKeys: [NCStatus.OPEN],
          enabled: true,
          deleted: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      nonConformities: [
        {
          id: 'nc-1',
          name: 'Missing record',
          status: NCStatus.OPEN,
          deleted: false,
          dueDate: tomorrowMorning,
          responsibleUser: {
            email: 'owner@example.com',
            fname: 'Grace',
            lname: 'Hopper',
          },
        },
        {
          id: 'nc-2',
          name: 'Closed record',
          status: NCStatus.CLOSED,
          deleted: false,
          dueDate: tomorrowMorning,
          responsibleUser: {
            email: 'closed@example.com',
            fname: 'Closed',
            lname: 'Owner',
          },
        },
      ],
    });

    await expect(service.sendDueReminders(now)).resolves.toBe(1);
    expect(queuePublisher.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        replaceString: expect.objectContaining({
          name: 'Grace Hopper',
          message: expect.stringContaining('due date is tomorrow'),
          link: 'https://app.example.com/act/non-conformities/nc-1',
        }),
      }),
    );
  });

  it('sends nothing for a disabled rule', async () => {
    const { service, queuePublisher } = serviceFor({
      rules: [auditRule(false)],
      audits: [
        {
          id: 'instance-1',
          auditProgramId: 'program-1',
          status: AuditInstanceStatus.SCHEDULED,
          startDate: tomorrowMorning,
          auditProgram: { title: 'Internal QMS', deleted: false },
          auditTeamMembers: [
            { auditPersonnel: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' } },
          ],
        },
      ],
    });

    await expect(service.sendDueReminders(now)).resolves.toBe(0);
    expect(queuePublisher.sendEmail).not.toHaveBeenCalled();
  });

  it('does not queue a reminder that was already delivered for that day', async () => {
    const day = anchorDay(anchorWindow(now, 1, 'before').from);
    const { service, queuePublisher } = serviceFor({
      rules: [auditRule()],
      deliveries: [
        {
          id: 'delivery-1',
          ruleId: DEFAULT_AUDIT_REMINDER_RULE_ID,
          sourceKey: 'audit_instance',
          entityId: 'instance-1',
          anchorDay: day,
          sentAt: 1,
        },
      ],
      audits: [
        {
          id: 'instance-1',
          auditProgramId: 'program-1',
          status: AuditInstanceStatus.SCHEDULED,
          startDate: tomorrowMorning,
          auditProgram: { title: 'Internal QMS', deleted: false },
          auditTeamMembers: [
            { auditPersonnel: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' } },
          ],
        },
      ],
    });

    await expect(service.sendDueReminders(now)).resolves.toBe(0);
    expect(queuePublisher.sendEmail).not.toHaveBeenCalled();
  });
});

describe('ReminderService.create', () => {
  it('rejects an unknown date or recipient', async () => {
    const { service } = serviceFor({ rules: [] });
    const base = {
      sourceKey: 'audit_instance',
      anchorKey: 'start_date',
      offsetDays: 1,
      direction: 'before' as const,
      recipientKeys: ['team'],
      statusKeys: [AuditInstanceStatus.SCHEDULED],
      enabled: true,
    };

    await expect(
      service.create({ ...base, anchorKey: 'due_date' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ ...base, recipientKeys: ['assignee'] }),
    ).rejects.toThrow('Unknown reminder recipient');
  });
});

describe('AuditInstanceReminderSource.findDue', () => {
  it('limits the query to the rule statuses and anchor window', async () => {
    const calls: unknown[][] = [];
    const qb: any = {
      innerJoinAndSelect: jest.fn(() => qb),
      leftJoinAndSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn((sql: string, params: unknown) => {
        calls.push([sql, params]);
        return qb;
      }),
      getMany: jest.fn(async () => []),
    };
    const source = new AuditInstanceReminderSource({
      createQueryBuilder: () => qb,
    } as any);
    const { from, to } = anchorWindow(now, 1, 'before');

    await source.findDue(
      {
        id: DEFAULT_AUDIT_REMINDER_RULE_ID,
        sourceKey: 'audit_instance',
        anchorKey: 'start_date',
        offsetDays: 1,
        direction: 'before',
        recipientKeys: ['team'],
        statusKeys: [AuditInstanceStatus.SCHEDULED],
        enabled: true,
      },
      from,
      to,
    );

    expect(calls).toContainEqual([
      'auditInstance.status IN (:...statuses)',
      { statuses: [AuditInstanceStatus.SCHEDULED] },
    ]);
    expect(calls).toContainEqual([
      'auditInstance.startDate BETWEEN :from AND :to',
      { from, to },
    ]);
  });
});
