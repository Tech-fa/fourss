import { User } from '../../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { AuditActivityType } from './audit-activity-type.entity';
import { AuditProgramStandard } from './audit-program-standard.entity';
import { AuditInstance } from './audit-instance.entity';
import { AuditProgramScheduleEntry } from './audit-program-schedule-entry.entity';
export enum AuditProgramStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED_PLAN',
}

@Entity('audit_programs')
export class AuditProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'scope', type: 'text', nullable: true })
  scope: string;

  @Column({ name: 'objective', type: 'text', nullable: true })
  objective: string;

  @Column({ name: 'start_date', type: 'bigint', nullable: true })
  startDate?: number;

  @Column({ name: 'duration', type: 'int', nullable: true })
  duration?: number;

  @Column({
    type: 'enum',
    enum: AuditProgramStatus,
    default: AuditProgramStatus.DRAFT,
  })
  status: AuditProgramStatus;

  @ManyToOne(() => AuditActivityType)
  @JoinColumn({ name: 'audit_activity_type_id' })
  auditActivityType: AuditActivityType;

  @Column({ name: 'audit_activity_type_id', type: 'uuid' })
  auditActivityTypeId: string;

  @OneToMany(
    () => AuditProgramStandard,
    (programStandard) => programStandard.auditProgram,
    { cascade: true },
  )
  standards: AuditProgramStandard[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;

  @OneToMany(() => AuditInstance, (auditInstance) => auditInstance.auditProgram, {
    cascade: true,
  })
  auditInstances?: AuditInstance[];

  @OneToMany(
    () => AuditProgramScheduleEntry,
    (scheduleEntry) => scheduleEntry.auditProgram,
    { cascade: true },
  )
  scheduleEntries?: AuditProgramScheduleEntry[];
}
