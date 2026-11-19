import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("integrations")
export class Integration {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Index()
  @Column({ type: "varchar", length: 255 })
  status: string;

  @Column({ name: "accepted_revision_id", type: "varchar", length: 36, nullable: true })
  acceptedRevisionId: string | null;

  @Column({ name: "inbound_path", type: "varchar", length: 160, nullable: true })
  inboundPath: string | null;

  @Index()
  @Column({ name: "next_run_at", type: "bigint", nullable: true })
  nextRunAt: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255 })
  createdById: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: string;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: string;

  @Column({ type: "boolean", default: false })
  deleted: boolean;
}
