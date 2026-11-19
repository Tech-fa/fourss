export const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_AUDIT_REMINDER_RULE_ID =
  'a1d17000-0000-4000-8000-000000000001';

export const REMINDER_SOURCE = {
  auditInstance: 'audit_instance',
  nonConformity: 'non_conformity',
  correctiveAction: 'corrective_action',
  immediateAction: 'immediate_action',
  document: 'document',
} as const;

export type ReminderDirection = 'before' | 'after';

export interface ReminderRecipient {
  email: string;
  name: string;
}

export interface ReminderMatch {
  entityId: string;
  title: string;
  linkPath: string;
  anchorAt: number;
  recipients: ReminderRecipient[];
}

export interface ReminderRuleView {
  id: string;
  sourceKey: string;
  anchorKey: string;
  offsetDays: number;
  direction: ReminderDirection;
  recipientKeys: string[];
  statusKeys: string[];
  enabled: boolean;
}

export interface CatalogChoice {
  key: string;
  labelKey: string;
}

export interface CatalogAnchor extends CatalogChoice {
  emailLabel: string;
}

export interface ReminderSource {
  key: string;
  labelKey: string;
  emailNoun: string;
  anchors: CatalogAnchor[];
  recipients: CatalogChoice[];
  statuses: CatalogChoice[];
  defaultRecipientKeys: string[];
  defaultStatusKeys: string[];
  findDue(
    rule: ReminderRuleView,
    from: number,
    to: number,
  ): Promise<ReminderMatch[]>;
}

type NamedPerson = {
  email?: string | null;
  fname?: string | null;
  lname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  deleted?: boolean;
};

export function anchorWindow(
  now: Date,
  offsetDays: number,
  direction: ReminderDirection,
): { from: number; to: number } {
  const startOfToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const shift = direction === 'before' ? offsetDays : -offsetDays;
  const from = startOfToday + shift * DAY_MS;
  return { from, to: from + DAY_MS - 1 };
}

export function anchorDay(from: number): string {
  return new Date(from).toISOString().slice(0, 10);
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return [];
    }
  }
  return [];
}

export function sameMembers(left: string[], right: string[]): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function personRecipient(
  person?: NamedPerson | null,
): ReminderRecipient | null {
  if (!person || person.deleted) return null;
  const email = person.email?.trim();
  if (!email) return null;
  const name = `${person.fname ?? person.firstName ?? ''} ${
    person.lname ?? person.lastName ?? ''
  }`.trim();
  return { email, name: name || email };
}

export function dedupeRecipients(
  people: Array<ReminderRecipient | null | undefined>,
): ReminderRecipient[] {
  const byEmail = new Map<string, ReminderRecipient>();
  for (const person of people) {
    if (!person) continue;
    const key = person.email.trim().toLowerCase();
    if (!key || byEmail.has(key)) continue;
    byEmail.set(key, { email: person.email.trim(), name: person.name });
  }
  return [...byEmail.values()];
}

export function selectedRecipients(
  keys: string[],
  selected: string,
  people: Array<NamedPerson | null | undefined>,
): ReminderRecipient[] {
  if (!keys.includes(selected)) return [];
  return dedupeRecipients(people.map((person) => personRecipient(person)));
}

export function timestampInWindow(
  value: unknown,
  from: number,
  to: number,
): number | null {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  if (ms < from || ms > to) return null;
  return ms;
}

export function formatUtcDateTime(value: number): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return `${formatted} UTC`;
}

export function timingPhrase(
  offsetDays: number,
  direction: ReminderDirection,
): string {
  if (offsetDays === 0) return 'today';
  if (offsetDays === 1 && direction === 'before') return 'tomorrow';
  if (offsetDays === 1 && direction === 'after') return 'yesterday';
  if (direction === 'before') return `in ${offsetDays} days`;
  return `${offsetDays} days ago`;
}

export function reminderMessage(input: {
  emailNoun: string;
  title: string;
  anchorLabel: string;
  offsetDays: number;
  direction: ReminderDirection;
  anchorAt: number;
}): string {
  return `Your ${input.emailNoun} '${input.title}' ${input.anchorLabel} is ${timingPhrase(
    input.offsetDays,
    input.direction,
  )} (${formatUtcDateTime(input.anchorAt)})`;
}

export function absoluteLink(path: string): string {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export function isDuplicateKeyError(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    errno?: number;
    driverError?: { code?: string; errno?: number };
  };
  const code = candidate?.code ?? candidate?.driverError?.code;
  const errno = candidate?.errno ?? candidate?.driverError?.errno;
  return code === 'ER_DUP_ENTRY' || errno === 1062;
}
