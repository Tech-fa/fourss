import { User } from '../../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { File } from '../../common/file.entity';
import {
  ExcludeField,
  TrackChanges,
} from '../../history/track-changes.decorator';
import { AuditInstance } from './audit-instance.entity';

@Entity('audit_instance_attachments')
@TrackChanges()
export class AuditInstanceAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditInstance, (auditInstance) => auditInstance.attachments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @ExcludeField()
  @JoinColumn({ name: 'audit_instance_id' })
  auditInstance: AuditInstance;

  @Column({ name: 'audit_instance_id', type: 'varchar' })
  @ExcludeField()
  auditInstanceId: string;

  @ManyToOne(() => File, { nullable: false })
  @ExcludeField()
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Column({ name: 'file_id', type: 'varchar' })
  @ExcludeField()
  fileId: string;

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
}
