import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { StandardImplementation } from "./standard-implementation.entity";

@Entity("standard_implementation_shares")
export class StandardImplementationShare {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "implementation_id" })
  implementationId: number;

  @ManyToOne(() => StandardImplementation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "implementation_id" })
  implementation: StandardImplementation;

  @Column({ name: "recipient_email", type: "varchar", length: 320 })
  recipientEmail: string;

  @Column({ name: "recipient_email_hash", type: "char", length: 64 })
  recipientEmailHash: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @Column({ name: "created_by" })
  createdById: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "expires_at", type: "bigint" })
  expiresAt: number;

  @Column({ name: "revoked_at", type: "bigint", nullable: true })
  revokedAt: number | null;
}
