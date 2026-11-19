import { Entity, PrimaryColumn } from "typeorm";

@Entity("integration_subscriptions")
export class IntegrationSubscription {
  @PrimaryColumn({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @PrimaryColumn({ name: "event_name", type: "varchar", length: 80 })
  eventName: string;
}
