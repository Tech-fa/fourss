import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Team } from '../../teams/team.entity';
import { NonConformityType } from './non-conformity-type.entity';
import { NonConformityRiskLevel } from './non-conformity-risk-level.entity';
import { NonConformityRepresentative } from './non-conformity-representative.entity';
import { Category } from './category.entity';
import { NCCustomFieldValue } from './nc-custom-field-value.entity';
import { NCCorrectiveAction } from './nc-corrective-action.entity';
import { AuditFinding } from '../../audit/entities/audit-finding.entity';
import { NcDueDateAmendment } from './nc-due-date-amendment.entity';

export enum NCStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum NCREPRESENTATIVETYPE {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

@Entity('non_conformities')
export class NonConformity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: number;

  @ManyToOne(() => NonConformityRepresentative, { nullable: true })
  @JoinColumn({ name: 'representative_id' })
  representative: NonConformityRepresentative | null;

  @Column({ name: 'representative_id', nullable: true })
  representativeId?: string | null;

  @Column({
    name: 'representative_type',
    type: 'enum',
    enum: NCREPRESENTATIVETYPE,
    default: NCREPRESENTATIVETYPE.EXTERNAL,
  })
  representativeType: NCREPRESENTATIVETYPE;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'internal_representative_id' })
  internalRepresentative: User | null;

  @Column({ name: 'internal_representative_id', nullable: true })
  internalRepresentativeId?: string | null;

  @ManyToOne(() => NonConformityRiskLevel)
  @JoinColumn({ name: 'non_conformity_risk_level_id' })
  nonConformityRiskLevel: NonConformityRiskLevel;

  @Column({ name: 'non_conformity_risk_level_id' })
  nonConformityRiskLevelId: string;

  @ManyToOne(() => NonConformityType)
  @JoinColumn({ name: 'non_conformity_type_id' })
  nonConformityType: NonConformityType;

  @Column({ name: 'non_conformity_type_id' })
  nonConformityTypeId: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id' })
  categoryId: string;

  @OneToMany(
    () => NCCustomFieldValue,
    (customFieldValue) => customFieldValue.nonConformity,
    {
      cascade: true,
    },
  )
  customFieldValues: NCCustomFieldValue[];

  @Column({ name: 'date_reported', type: 'bigint' })
  dateReported: number;

  @Column({ name: 'due_date', type: 'bigint' })
  dueDate: number;

  @Column({ name: 'problem_statement', type: 'text' })
  problemStatement: string;

  @Column({ name: 'objective_evidence', nullable: true, type: 'text' })
  objectiveEvidence: string;

  @Column({ name: 'requirements', nullable: true, type: 'text' })
  requirements: string;

  @Column({
    type: 'enum',
    enum: NCStatus,
    default: NCStatus.OPEN,
  })
  status: NCStatus;

  @Column({ type: 'simple-array', nullable: true, name: 'evidence_files' })
  evidenceFiles: string[];

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(() => NCCorrectiveAction, (correctiveAction) => correctiveAction.nonConformity)
  correctiveActions: NCCorrectiveAction[];

  @OneToMany(() => NcDueDateAmendment, (amendment) => amendment.nonConformity)
  dueDateAmendments: NcDueDateAmendment[];

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closed_by' })
  closedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @Column({ name: 'responsible_user_id', nullable: true })
  responsibleUserId: string | null;

  @OneToOne(() => AuditFinding, (auditFinding) => auditFinding.nonConformity, {
    cascade: true,
    nullable: true,
  })
  auditFinding: AuditFinding;

  @ManyToOne(() => AuditFinding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'finding_id' })
  finding: AuditFinding | null;

  @Column({ name: 'finding_id', type: 'varchar', length: 36, nullable: true, unique: true })
  findingId: string | null;

  @Column({ name: 'audit_id', type: 'varchar', length: 255, nullable: true })
  auditId: string | null;

  @Column({ name: 'closing_comment', nullable: true, type: 'longtext'})
  closingComment: string;

  @Column({ name: 'needs_investigation', default: false })
  needsInvestigation: boolean;
}
