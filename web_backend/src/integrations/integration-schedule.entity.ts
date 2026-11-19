import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("integration_schedules")
export class IntegrationSchedule {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @PrimaryColumn({ type: "varchar", length: 64 })
  name: string;

  @Column({ name: "every_seconds", type: "int" })
  everySeconds: number;

  @Column({ name: "next_run_at", type: "bigint" })
  nextRunAt: string;
}
