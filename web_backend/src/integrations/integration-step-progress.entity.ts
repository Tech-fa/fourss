import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("integration_step_progress")
export class IntegrationStepProgress {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @PrimaryColumn({ name: "step_id", type: "varchar", length: 64 })
  stepId: string;

  @Column({ name: "done_at", type: "bigint" })
  doneAt: string;
}
