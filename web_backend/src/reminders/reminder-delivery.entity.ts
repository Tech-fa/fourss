import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('reminder_deliveries')
@Index(['ruleId', 'entityId', 'anchorDay'], { unique: true })
export class ReminderDelivery {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'rule_id', type: 'varchar', length: 36 })
  ruleId: string;

  @Column({ name: 'source_key', type: 'varchar', length: 64 })
  sourceKey: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 255 })
  entityId: string;

  @Column({ name: 'anchor_day', type: 'varchar', length: 10 })
  anchorDay: string;

  @Column({ name: 'sent_at', type: 'bigint' })
  sentAt: number;
}
