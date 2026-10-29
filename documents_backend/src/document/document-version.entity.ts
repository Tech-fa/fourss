import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Document } from "./document.entity";
import { ChangeRequest } from "./change-request.entity";
import { DocumentStatus } from "./document.enums";
import { User } from "../user/user.entity";
import { DocumentChecklist } from "./document-checklist.entity";

@Entity("document_versions")
export class DocumentVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", name: "version_number" })
  versionNumber: number;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @Column({ name: "created_by" })
  createdById: string;

  @ManyToOne(() => Document, (document) => document.versions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "document_id" })
  document: Document;

  @Column({ name: "document_id" })
  documentId: string;

  @Column({ name: "file", type: "text" })
  file: string;

  @Column({
    name: "status",
    type: "enum",
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ name: "changes", type: "text", nullable: true })
  changes: string | null;

  @Column({ name: "reason_for_change", type: "text", nullable: true })
  reasonForChange: string;

  @OneToOne(() => ChangeRequest)
  @JoinColumn({ name: "change_request_id" })
  changeRequest: ChangeRequest;

  @Column({ name: "change_request_id", nullable: true })
  changeRequestId: number;

  @OneToOne(() => DocumentChecklist, (checklist) => checklist.documentVersion, {
    cascade: true,
  })
  checklist?: DocumentChecklist | null;
}
