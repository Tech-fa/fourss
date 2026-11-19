import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("integration_values")
export class IntegrationValue {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @PrimaryColumn({ name: "config_key", type: "varchar", length: 64 })
  configKey: string;

  @Column({ type: "text" })
  ciphertext: string;

  @Column({ type: "boolean", default: false })
  secret: boolean;
}
