import { User } from '../../user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AuditPersonnel } from './audit-personnel.entity';
import { AuditRole } from './audit-role.entity';
import { AuditInstance } from './audit-instance.entity';

@Entity('audit_team_members')
export class AuditTeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditInstance, { nullable: true })
  @JoinColumn({ name: 'audit_instance_id' })
  auditInstance: AuditInstance;

  @Column({ name: 'audit_instance_id', type: 'varchar' })
  auditInstanceId: string;

  @ManyToOne(() => AuditPersonnel, { nullable: false })
  @JoinColumn({ name: 'audit_personnel_id' })
  auditPersonnel: AuditPersonnel;

  @Column({ name: 'audit_personnel_id', type: 'varchar' })
  auditPersonnelId: string;

  @ManyToOne(() => AuditRole, { nullable: false })
  @JoinColumn({ name: 'audit_role_id' })
  auditRole: AuditRole;

  @Column({ name: 'audit_role_id', type: 'varchar' })
  auditRoleId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id', type: 'varchar' })
  createdById: string;


  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 