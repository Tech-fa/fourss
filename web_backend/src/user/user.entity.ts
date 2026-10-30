import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  OneToMany,
  Index,
} from "typeorm";
import { TrackChanges, ExcludeField } from "../history/track-changes.decorator";
import { TeamMember } from "../teams/team-member.entity";

@Entity("users")
@TrackChanges()
export class User {
  @PrimaryColumn({ name: "id" })
  id: string;

  @Column({ name: "fname", type: "varchar", length: 255 })
  fname: string;

  @Column({ name: "lname", type: "varchar", length: 255 })
  lname: string;

  @Column({
    name: "phone",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  phone: string;

  @Column({
    name: "office_extension",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  officeExtension: string | null;

  @Column({ name: "email", type: "varchar", length: 255 })
  email: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "password", type: "text" })
  @ExcludeField()
  password: string;

  @Column({ name: "failed_logins", type: "int" })
  failedLogins: number;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive: boolean;

  @Column({ name: "verified_at", type: "bigint", nullable: true })
  verifiedAt?: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  @ExcludeField()
  createdBy?: User;

  @Column({ name: "created_by", type: "varchar", length: 36, nullable: true })
  createdById?: string;

  @OneToMany(() => TeamMember, (membership) => membership.user, {
    cascade: true,
  })
  @ExcludeField()
  teamMemberships: TeamMember[];

  @Column({ name: "deleted", type: "boolean", default: false })
  @Index()
  deleted: boolean;

  @Column({ name: "last_login", type: "bigint", nullable: true })
  lastLogin?: number;

  @Column({ name: "locale", type: "varchar", length: 10, default: "en" })
  locale?: string;

  @Column({ name: "is_top_management", type: "boolean", default: false })
  isTopManagement?: boolean;
}
