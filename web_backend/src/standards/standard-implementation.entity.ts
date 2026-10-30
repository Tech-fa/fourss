import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { StandardImplementationDocument } from "./standard-implementation-document.entity";
import { ImplementationStatus } from "./standards.enums";

export { ImplementationDocumentStatus, ImplementationStatus } from "./standards.enums";

@Entity("standard_implementations")
export class StandardImplementation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "standard_key", type: "varchar", length: 64, unique: true })
  standardKey: string;

  @Column({ name: "standard_name", type: "varchar", length: 255 })
  standardName: string;

  @Column({
    type: "enum",
    enum: ImplementationStatus,
    default: ImplementationStatus.IN_PROGRESS,
  })
  status: ImplementationStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @Column({ name: "created_by" })
  createdById: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;

  @OneToMany(
    () => StandardImplementationDocument,
    (document) => document.implementation,
    { cascade: true },
  )
  documents: StandardImplementationDocument[];
}
