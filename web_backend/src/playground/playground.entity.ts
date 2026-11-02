import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { Team } from "../teams/team.entity";
import { User } from "../user/user.entity";

@Entity("playgrounds")
export class Playground {
  @PrimaryColumn({ type: "varchar", length: 255 })
  id: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "team_id" })
  team: Team;

  @Column({ name: "team_id", type: "int" })
  teamId: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "mediumtext" })
  source: string;

  @Column({ type: "int", default: 0 })
  revision: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @Column({ name: "created_by", type: "varchar", length: 255 })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "publisher_id" })
  publisher: User | null;

  @Column({ name: "publisher_id", type: "varchar", length: 255, nullable: true })
  publisherId: string | null;

  @Column({ type: "tinyint", default: 0 })
  enabled: boolean;

  @Column({ name: "last_published_at", type: "bigint", nullable: true })
  lastPublishedAt: number | null;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;

  @Column({ type: "tinyint", default: 0 })
  deleted: boolean;
}
