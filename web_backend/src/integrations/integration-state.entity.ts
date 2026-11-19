import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("integration_state")
export class IntegrationState {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @PrimaryColumn({ name: "state_key", type: "varchar", length: 128 })
  stateKey: string;

  @Column({ type: "text" })
  value: string;
}
