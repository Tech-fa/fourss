import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("integration_failures")
export class IntegrationFailure {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id: string;

  @Index()
  @Column({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @Column({ name: "revision_id", type: "varchar", length: 36 })
  revisionId: string;

  @Column({ type: "varchar", length: 32 })
  hook: string;

  @Column({ type: "text" })
  message: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: string;
}
