import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';
import { CaChangeRequest } from './ca_change_request.entity';
import { CaEffectivenessEvidence } from './ca-effectiveness-evidence.entity';
import { NCCorrectiveActionCauses } from './nc-corrective-action-causes.entity';

export enum NCCorrectiveActionPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

export enum NCCorrectiveActionStatus {
  OPEN = 'OPEN',
  APPLIED = 'APPLIED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
}

export enum NCCorrectiveActionSource {
  RCA = 'RCA',
  MANUAL = 'MANUAL',
  INVESTIGATION = 'INVESTIGATION',
}

@Entity('nc_corrective_actions')
export class NCCorrectiveAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({type: 'text'})
  description: string;

  @Column({type: 'text'})
  expectedOutcome: string;

  @ManyToOne(
    () => NonConformity,
    (nonConformity) => nonConformity.correctiveActions,
  )
  @JoinColumn({ name: 'non_conformity_id' })
  nonConformity: NonConformity;

  @Column({ name: 'non_conformity_id' })
  nonConformityId: string;

  @Column({ type: 'enum', enum: NCCorrectiveActionPriority })
  priority: NCCorrectiveActionPriority;

  @Column({ name: 'due_date', type: 'bigint' })
  dueDate: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'assigned_to_id' })
  assignedToId: string;


  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: User;

  @Column({ name: 'verified_by_id', nullable: true })
  verifiedById: string;

  @Column({ name: 'verified_at', type: 'bigint', nullable: true })
  verifiedAt: number;

  @Column({ name: 'closed_at', type: 'bigint', nullable: true })
  closedAt: number;

  @Column({ name: 'applied_at', type: 'bigint', nullable: true })
  appliedAt: number;

  @Column({ name: 'rejection_explanation', type: 'text', nullable: true })
  rejectionExplanation: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ type: 'enum', enum: NCCorrectiveActionStatus })
  status: NCCorrectiveActionStatus;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(() => CaChangeRequest, (changeRequest) => changeRequest.ca)
  changeRequests: CaChangeRequest[];

  @OneToMany(() => CaEffectivenessEvidence, (effectivenessEvidence) => effectivenessEvidence.ca)
  effectivenessEvidences: CaEffectivenessEvidence[];

  @Column({ name: 'source', type: 'enum', enum: NCCorrectiveActionSource })
  source: NCCorrectiveActionSource;

  //many to one with rca

  @OneToMany(() => NCCorrectiveActionCauses, (ncCorrectiveActionCauses) => ncCorrectiveActionCauses.ncCorrectiveAction, { cascade: true })
  ncCorrectiveActionCauses: NCCorrectiveActionCauses[];
}
