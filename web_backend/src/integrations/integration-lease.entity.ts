import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("integration_leases")
export class IntegrationLease {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @Column({ type: "varchar", length: 64 })
  owner: string;

  @Column({ name: "expires_at", type: "bigint" })
  expiresAt: string;
}
