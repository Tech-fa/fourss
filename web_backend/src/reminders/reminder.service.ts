import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { EmailType } from '../common/dto';
import { QueuePublisher } from '../queue/queue.publisher';
import { ReminderDelivery } from './reminder-delivery.entity';
import { ReminderRule } from './reminder-rule.entity';
import {
  absoluteLink,
  anchorDay,
  anchorWindow,
  asStringArray,
  isDuplicateKeyError,
  reminderMessage,
  sameMembers,
  type ReminderDirection,
  type ReminderRuleView,
  type ReminderSource,
} from './reminder.logic';

export const REMINDER_SOURCES = 'REMINDER_SOURCES';

type ReminderRuleInput = {
  sourceKey: string;
  anchorKey: string;
  offsetDays: number;
  direction: ReminderDirection;
  recipientKeys: string[];
  statusKeys: string[];
  enabled: boolean;
};

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(ReminderRule)
    private readonly rules: Repository<ReminderRule>,
    @InjectRepository(ReminderDelivery)
    private readonly deliveries: Repository<ReminderDelivery>,
    @Inject(REMINDER_SOURCES)
    private readonly sources: ReminderSource[],
    private readonly queuePublisher: QueuePublisher,
  ) {}

  getCatalog() {
    return {
      sources: this.sources.map((source) => ({
        key: source.key,
        labelKey: source.labelKey,
        anchors: source.anchors.map(({ key, labelKey }) => ({ key, labelKey })),
        recipients: source.recipients,
        statuses: source.statuses,
        defaultRecipientKeys: source.defaultRecipientKeys,
        defaultStatusKeys: source.defaultStatusKeys,
      })),
    };
  }

  async list(): Promise<ReminderRuleView[]> {
    const rules = await this.rules.find({
      where: { deleted: false },
      order: { createdAt: 'ASC' },
    });
    return rules.map((rule) => this.toView(rule));
  }

  async create(dto: ReminderRuleInput): Promise<ReminderRuleView> {
    const view = this.normalize(dto);
    await this.assertUnique(view);
    const now = Date.now();
    const saved = await this.rules.save(
      this.rules.create({
        ...view,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }),
    );
    return this.toView(saved);
  }

  async update(id: string, dto: ReminderRuleInput): Promise<ReminderRuleView> {
    const existing = await this.findActive(id);
    const view = this.normalize(dto, id);
    await this.assertUnique(view);
    existing.sourceKey = view.sourceKey;
    existing.anchorKey = view.anchorKey;
    existing.offsetDays = view.offsetDays;
    existing.direction = view.direction;
    existing.recipientKeys = view.recipientKeys;
    existing.statusKeys = view.statusKeys;
    existing.enabled = view.enabled;
    existing.updatedAt = Date.now();
    return this.toView(await this.rules.save(existing));
  }

  async remove(id: string): Promise<{ id: string }> {
    const existing = await this.findActive(id);
    existing.deleted = true;
    existing.updatedAt = Date.now();
    await this.rules.save(existing);
    return { id };
  }

  async sendDueReminders(now = new Date()): Promise<number> {
    const rules = await this.rules.find({
      where: { enabled: true, deleted: false },
    });
    let queued = 0;
    for (const rule of rules) {
      const view = this.toView(rule);
      const source = this.sources.find((item) => item.key === view.sourceKey);
      if (!source) {
        this.logger.warn(
          `Reminder rule ${rule.id} uses unknown source ${view.sourceKey}`,
        );
        continue;
      }
      const { from, to } = anchorWindow(now, view.offsetDays, view.direction);
      const matches = await source.findDue(view, from, to);
      const day = anchorDay(from);
      for (const match of matches) {
        if (!match.recipients.length) continue;
        const recorded = await this.recordDelivery(
          rule.id,
          view.sourceKey,
          match.entityId,
          day,
        );
        if (!recorded) continue;
        queued += this.queueMatch(source, view, match);
      }
    }
    return queued;
  }

  private queueMatch(
    source: ReminderSource,
    rule: ReminderRuleView,
    match: {
      title: string;
      linkPath: string;
      anchorAt: number;
      recipients: { email: string; name: string }[];
    },
  ): number {
    const anchor = source.anchors.find((item) => item.key === rule.anchorKey);
    const message = reminderMessage({
      emailNoun: source.emailNoun,
      title: match.title,
      anchorLabel: anchor?.emailLabel ?? rule.anchorKey,
      offsetDays: rule.offsetDays,
      direction: rule.direction,
      anchorAt: match.anchorAt,
    });
    const link = absoluteLink(match.linkPath);
    for (const recipient of match.recipients) {
      this.queuePublisher.sendEmail({
        to: recipient.email,
        type: EmailType.NOTIFICATION,
        subject: `Reminder: ${match.title}`,
        replaceString: {
          name: recipient.name,
          message,
          link,
        },
      });
    }
    return match.recipients.length;
  }

  private async recordDelivery(
    ruleId: string,
    sourceKey: string,
    entityId: string,
    day: string,
  ): Promise<boolean> {
    const existing = await this.deliveries.findOne({
      where: { ruleId, entityId, anchorDay: day },
    });
    if (existing) return false;
    try {
      await this.deliveries.insert({
        id: randomUUID(),
        ruleId,
        sourceKey,
        entityId,
        anchorDay: day,
        sentAt: Date.now(),
      });
      return true;
    } catch (error) {
      if (isDuplicateKeyError(error)) return false;
      throw error;
    }
  }

  private async findActive(id: string): Promise<ReminderRule> {
    const rule = await this.rules.findOne({ where: { id, deleted: false } });
    if (!rule) throw new NotFoundException('Reminder rule not found');
    return rule;
  }

  private normalize(dto: ReminderRuleInput, id = ''): ReminderRuleView {
    const source = this.sources.find((item) => item.key === dto.sourceKey);
    if (!source) throw new BadRequestException('Unknown reminder record type');
    if (!source.anchors.some((anchor) => anchor.key === dto.anchorKey)) {
      throw new BadRequestException('Unknown reminder date');
    }
    const recipientKeys = [...new Set(dto.recipientKeys)];
    if (
      recipientKeys.some(
        (key) => !source.recipients.some((recipient) => recipient.key === key),
      )
    ) {
      throw new BadRequestException('Unknown reminder recipient');
    }
    const statusKeys = [...new Set(dto.statusKeys)];
    if (
      statusKeys.some(
        (key) => !source.statuses.some((status) => status.key === key),
      )
    ) {
      throw new BadRequestException('Unknown reminder status');
    }
    return {
      id,
      sourceKey: dto.sourceKey,
      anchorKey: dto.anchorKey,
      offsetDays: dto.offsetDays,
      direction: dto.offsetDays === 0 ? 'before' : dto.direction,
      recipientKeys,
      statusKeys,
      enabled: dto.enabled,
    };
  }

  private async assertUnique(view: ReminderRuleView): Promise<void> {
    const existing = await this.rules.find({
      where: { sourceKey: view.sourceKey, deleted: false },
    });
    const duplicate = existing.some(
      (rule) =>
        rule.id !== view.id &&
        rule.anchorKey === view.anchorKey &&
        Number(rule.offsetDays) === view.offsetDays &&
        (view.offsetDays === 0 || rule.direction === view.direction) &&
        sameMembers(asStringArray(rule.recipientKeys), view.recipientKeys) &&
        sameMembers(asStringArray(rule.statusKeys), view.statusKeys),
    );
    if (duplicate) {
      throw new BadRequestException(
        'A reminder with these settings already exists',
      );
    }
  }

  private toView(rule: ReminderRule): ReminderRuleView {
    return {
      id: rule.id,
      sourceKey: rule.sourceKey,
      anchorKey: rule.anchorKey,
      offsetDays: Number(rule.offsetDays),
      direction: rule.direction,
      recipientKeys: asStringArray(rule.recipientKeys),
      statusKeys: asStringArray(rule.statusKeys),
      enabled: Boolean(rule.enabled),
    };
  }
}
