import { User } from '../../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditInstance } from './audit-instance.entity';
import {
  ExcludeField,
  TrackChanges,
} from '../../history/track-changes.decorator';

export enum AuditReportType {
  GENERATED = 'GENERATED',
  UPLOADED = 'UPLOADED',
}

@Entity('audit_reports')
@TrackChanges()
export class AuditReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditInstance, { nullable: false })
  @ExcludeField()
  @JoinColumn({ name: 'audit_instance_id' })
  auditInstance: AuditInstance;

  @Column({ name: 'audit_instance_id', type: 'varchar' })
  @ExcludeField()
  auditInstanceId: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({
    type: 'enum',
    enum: AuditReportType,
    default: AuditReportType.UPLOADED,
  })
  type: AuditReportType;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'original_date', type: 'bigint', nullable: true })
  originalDate?: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  @ExcludeField()
  createdBy: User;

  @Column({ name: 'created_by_user_id', type: 'varchar' })
  @ExcludeField()
  createdByUserId: string;

  @Column({ name: 'created_at', type: 'bigint' })
  @ExcludeField()
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  @ExcludeField()
  updatedAt: number;
} 