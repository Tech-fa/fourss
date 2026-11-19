import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditInstance } from './audit-instance.entity';
import { AuditProgram } from './audit-program.entity';

@Entity('audit_program_schedule_entries')
export class AuditProgramScheduleEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditProgram, (program) => program.scheduleEntries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'audit_program_id' })
  auditProgram: AuditProgram;

  @Column({ name: 'audit_program_id', type: 'varchar' })
  auditProgramId: string;

  @Column({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'month', type: 'int' })
  month: number;

  @Column({ name: 'process', type: 'varchar' })
  process: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'is_unplanned', type: 'boolean', default: false })
  isUnplanned: boolean;

  @Column({ name: 'amendment_reason', type: 'text', nullable: true })
  amendmentReason?: string;

  @ManyToOne(() => AuditInstance, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'audit_instance_id' })
  auditInstance?: AuditInstance;

  @Column({ name: 'audit_instance_id', type: 'varchar', nullable: true })
  auditInstanceId?: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;
}
