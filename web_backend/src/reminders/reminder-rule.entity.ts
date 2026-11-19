import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ReminderDirection } from './reminder.logic';

@Entity('reminder_rules')
export class ReminderRule {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'source_key', type: 'varchar', length: 64 })
  sourceKey: string;

  @Column({ name: 'anchor_key', type: 'varchar', length: 64 })
  anchorKey: string;

  @Column({ name: 'offset_days', type: 'int' })
  offsetDays: number;

  @Column({ type: 'varchar', length: 16 })
  direction: ReminderDirection;

  @Column({ name: 'recipient_keys', type: 'json' })
  recipientKeys: string[];

  @Column({ name: 'status_keys', type: 'json' })
  statusKeys: string[];

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;
}
