import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentApprover } from './document-approver.entity';
import { ApprovalStrategyTeam } from './approval-strategy-team.entity';
import { DocumentType } from './document-type.entity';

@Entity('approval_strategies')
export class ApprovalStrategy {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(
    () => ApprovalStrategyTeam,
    (strategyTeam) => strategyTeam.strategy,
    {
      cascade: true,
    },
  )
  teams: ApprovalStrategyTeam[];

  /** Category-based strategy. Mutually exclusive with teams. */
  @ManyToOne(() => DocumentType, { nullable: true })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType | null;

  @Column({ name: 'required_reviews' })
  requiredReviews: number;

  @Column({ name: 'required_approvals' })
  requiredApprovals: number;

  @Column({ nullable: true })
  description: string;

  @Column()
  name: string;

  @Column({
    name: 'max_review_duration',
    nullable: true,
    comment: 'Duration in days',
  })
  maxReviewDuration: number;

  @Column({
    name: 'max_approval_duration',
    nullable: true,
    comment: 'Duration in days',
  })
  maxApprovalDuration: number;

  @Column({ default: false })
  deleted: boolean;

  @OneToMany(
    () => DocumentApprover,
    (documentApprover) => documentApprover.strategy,
    { cascade: true }
  )
  documentApprovers: DocumentApprover[];

  @Column({ default: false, name: 'all_approvers' })
  allApprovers: boolean;

  @Column({ default: false, name: 'all_reviewers' })
  allReviewers: boolean;

  /** When true, reviewers and approvers must act in `documentApprovers.order`, unless that role uses all reviewers or all approvers. */
  @Column({ default: false, name: 'allow_ordering' })
  allowOrdering: boolean;

  @Column({ default: false, name: 'no_review' })
  noReview: boolean;

  @Column({ default: false, name: 'no_approve' })
  noApprove: boolean;

  /** Catch-all strategy for categories without their own strategy. */
  @Column({ default: false, name: 'is_default' })
  isDefault: boolean;
}
