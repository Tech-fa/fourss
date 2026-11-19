import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { User } from "../user/user.entity";
import { NonConformity } from "../non-conformities/entities/non-conformity.entity";
import { ImmediateActionEvidence } from "./evidence.entity";
import { ImmediateActionComment } from "./immediate-action-comment.entity";
import { ImmediateActionEvidenceType } from "./immediate-action-evidence-type";

export { ImmediateActionEvidenceType } from "./immediate-action-evidence-type";

export enum ImmediateActionStatus {
  OPEN = "open",
  READY_FOR_VERIFICATION = "ready_for_verification",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

@Entity("immediate_actions")
export class ImmediateAction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => NonConformity, { nullable: true })
  @JoinColumn({ name: "nc_id" })
  nc: NonConformity;

  @Column({ type: "text" })
  description: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo: User;

  @Column({ name: "due_date", type: "bigint", nullable: true })
  dueDate: number;

  @Column({
    name: "status",
    type: "enum",
    enum: ImmediateActionStatus,
    default: ImmediateActionStatus.OPEN,
  })
  status: ImmediateActionStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "verified_by_id" })
  verifiedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;

  @Column({ name: "verified_at", type: "bigint", nullable: true })
  verifiedAt: number;

  @Column({ name: "closed_at", type: "bigint", nullable: true })
  closedAt: number;

  @Column({ name: "applied_at", type: "bigint", nullable: true })
  appliedAt: number;

  @Column({
    name: "evidence_type",
    type: "enum",
    enum: ImmediateActionEvidenceType,
    default: ImmediateActionEvidenceType.FILE,
  })
  evidenceType: ImmediateActionEvidenceType;

  @Column({ name: "rejection_explanation", type: "text", nullable: true })
  rejectionExplanation: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint", nullable: true })
  updatedAt?: number;

  @BeforeInsert()
  setUpdatedAtOnInsert() {
    if (this.updatedAt == null) {
      this.updatedAt = this.createdAt || Date.now();
    }
  }

  @BeforeUpdate()
  setUpdatedAtOnUpdate() {
    this.updatedAt = Date.now();
  }

  @OneToMany(
    () => ImmediateActionEvidence,
    (evidence) => evidence.immediateAction,
  )
  evidence: ImmediateActionEvidence[];

  @OneToMany(() => ImmediateActionComment, (comment) => comment.immediateAction)
  comments: ImmediateActionComment[];
}
