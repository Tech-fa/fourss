import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import type { Capabilities, ConfigField, SetupStep } from "./integration.model";

@Entity("integration_revisions")
@Index(["integrationId", "number"], { unique: true })
export class IntegrationRevision {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id: string;

  @Index()
  @Column({ name: "integration_id", type: "varchar", length: 36 })
  integrationId: string;

  @Column({ type: "int" })
  number: number;

  @Column({ type: "mediumtext" })
  source: string;

  @Column({ name: "page_html", type: "mediumtext" })
  pageHtml: string;

  @Column({ name: "page_js", type: "mediumtext" })
  pageJs: string;

  @Column({ type: "json" })
  capabilities: Capabilities;

  @Column({ type: "json" })
  inputs: ConfigField[];

  @Column({ type: "json" })
  steps: SetupStep[];

  @Column({ type: "varchar", length: 16 })
  status: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: string;
}
