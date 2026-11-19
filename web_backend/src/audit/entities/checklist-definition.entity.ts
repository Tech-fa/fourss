import { Team } from '../../teams/team.entity';
import { User } from '../../user/user.entity';
import { AuditActivityType } from './audit-activity-type.entity';
import { ChecklistDefinitionVersion } from './checklist-definition-version.entity';
import { ChecklistDefinitionTeam } from './checklist-definition-team.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('checklist_definitions')
export class ChecklistDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @ManyToOne(() => AuditActivityType, { nullable: true })
  @JoinColumn({ name: 'activity_type_id' })
  activityType?: AuditActivityType;

  @Column({ name: 'activity_type_id', type: 'varchar', nullable: true })
  activityTypeId?: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;

  @OneToMany(
    () => ChecklistDefinitionVersion,
    (version) => version.checklistDefinition,
    { cascade: true },
  )
  versions: ChecklistDefinitionVersion[];

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team?: Team;

  @Column({ name: 'team_id', type: 'int', nullable: true })
  teamId?: number;

  @OneToMany(
    () => ChecklistDefinitionTeam,
    (link) => link.checklistDefinition,
    { cascade: true },
  )
  teams: ChecklistDefinitionTeam[];

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft: boolean;
}
