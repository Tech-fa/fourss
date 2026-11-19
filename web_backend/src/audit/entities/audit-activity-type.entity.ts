import { User } from '../../user/user.entity';
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('audit_activity_types')
@Unique(['name'])
export class AuditActivityType  {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ type: 'boolean', name: 'deleted' })
  deleted: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
}
