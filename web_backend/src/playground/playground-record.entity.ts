import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { Playground } from "./playground.entity";

export type PlaygroundScalar = string | number | boolean | null;

@Entity("playground_records")
export class PlaygroundRecord {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @ManyToOne(() => Playground, { onDelete: "CASCADE" })
  @JoinColumn({ name: "playground_id" })
  playground: Playground;

  @Column({ name: "playground_id", type: "varchar", length: 255 })
  playgroundId: string;

  @Column({ name: "team_id", type: "int" })
  teamId: number;

  @Column({ name: "entity_type", type: "varchar", length: 64 })
  entityType: string;

  @Column({ type: "json" })
  data: Record<string, PlaygroundScalar>;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @Column({ name: "created_by", type: "varchar", length: 255 })
  createdById: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;

  @Column({ type: "tinyint", default: 0 })
  deleted: boolean;
}
