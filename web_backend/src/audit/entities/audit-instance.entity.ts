import { User } from '../../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditProgram } from './audit-program.entity';
import { ChecklistDefinitionVersion } from './checklist-definition-version.entity';
import { AuditTeamMember } from './audit-team-member.entity';
import {
  ExcludeField,
  TrackChanges,
} from '../../history/track-changes.decorator';
import { AuditChecklistResponse } from './audit-checklist-response.entity';
import { AuditInstanceAttachment } from './audit-instance-attachment.entity';
import { AuditInstanceChecklistVersion } from './audit-instance-checklist-versions.entity';

export enum AuditInstanceStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

@Entity('audit_instances')
@TrackChanges()
export class AuditInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditProgram, { nullable: false })
  @ExcludeField()
  @JoinColumn({ name: 'audit_program_id' })
  auditProgram: AuditProgram;

  @Column({ name: 'audit_program_id', type: 'varchar' })
  @ExcludeField()
  auditProgramId: string;

  @Column({ name: 'audit_document_id', type: 'varchar', nullable: true })
  @ExcludeField()
  auditDocumentId?: string;

  @Column({ name: 'start_date', type: 'bigint', nullable: true })
  startDate?: number;

  @Column({ name: 'end_date', type: 'bigint', nullable: true })
  endDate?: number;

  @ManyToOne(() => ChecklistDefinitionVersion, { nullable: true })
  @JoinColumn({ name: 'assigned_checklist_definition_version_id' })
  @ExcludeField()
  checklistDefinitionVersion?: ChecklistDefinitionVersion;

  @Column({
    name: 'assigned_checklist_definition_version_id',
    type: 'varchar',
    nullable: true,
  })
  @ExcludeField()
  checklistDefinitionVersionId?: string;

  @OneToMany(() => AuditInstanceChecklistVersion, (checklistVersion) => checklistVersion.auditInstance, {
    cascade: true,
  })
  @ExcludeField()
  checklistVersions?: AuditInstanceChecklistVersion[];

  @Column({
    type: 'enum',
    enum: AuditInstanceStatus,
    default: AuditInstanceStatus.SCHEDULED,
  })
  status: AuditInstanceStatus;

  @OneToMany(() => AuditTeamMember, (teamMember) => teamMember.auditInstance, {
    cascade: true,
    eager: false,
  })
  @ExcludeField()
  auditTeamMembers?: AuditTeamMember[];

  @OneToMany(() => AuditChecklistResponse, (response) => response.auditInstance, {
    cascade: true,
    eager: false,
  })
  @ExcludeField()
  auditChecklistResponses?: AuditChecklistResponse[];

  @OneToMany(() => AuditInstanceAttachment, (attachment) => attachment.auditInstance, {
    cascade: true,
  })
  @ExcludeField()
  attachments?: AuditInstanceAttachment[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'scheduled_by_user_id' })
  @ExcludeField()
  scheduledBy: User;

  @Column({ name: 'scheduled_by_user_id', type: 'varchar' })
  @ExcludeField()
  scheduledByUserId: string;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ name: 'created_at', type: 'bigint' })
  @ExcludeField()
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  @ExcludeField()
  updatedAt: number;

  @Column({ name: 'audit_summary', type: 'text', nullable: true })
  auditSummary: string;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  @ExcludeField()
  deleted: boolean;

  @Column({ name: 'audit_id', type: 'varchar', length: 255, nullable: true })
  auditId?: string;

  @Column({ name: 'criteria', type: 'text', nullable: true })
  criteria?: string | null;

  @Column({ name: 'scope', type: 'text', nullable: true })
  scope: string;

  @Column({ name: 'objective', type: 'text', nullable: true })
  objective: string;
}
