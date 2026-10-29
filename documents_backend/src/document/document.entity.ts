import { DocumentType } from "./document-type.entity";
import { Team } from "../teams/team.entity";
import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from "typeorm";
import { DocumentVersion } from "./document-version.entity";
import { User } from "../user/user.entity";
import { ApprovalStrategy } from "./approval-strategy.entity";
import { DocumentAcknowledgement } from "./document-acknowledgement.entity";
import { DocumentComment } from "./document-comment.entity";
import { DocumentContributor } from "./document-contributor.entity";
import { ExcludeField, TrackChanges } from "../history/track-changes.decorator";
import { ChangeRequestDocument } from "./change-request-document.entity";
import { DocumentTemplate } from "./document-template.entity";

export enum ContentType {
  FILE = "FILE",
  EDITOR = "EDITOR",
  CHECKLIST = "CHECKLIST",
}

@Entity("documents")
@Unique("UQ_document_team_id", ["team", "documentCode"])
@TrackChanges()
export class Document {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ name: "due_date", type: "bigint", nullable: true })
  dueDate: number;

  @Column({ name: "document_code" })
  documentCode: string;

  @Column({ type: "tinyint", default: 0, name: "is_public" })
  isPublic: boolean;

  @Column({ type: "tinyint", default: 0, name: "is_ai_accessible" })
  isAiAccessible: boolean;

  @Column({ name: "is_obsolete", type: "tinyint", default: 0 })
  isObsolete: boolean;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  @ExcludeField()
  updatedAt: number;

  @ManyToOne(() => DocumentType)
  @JoinColumn({ name: "document_type_id" })
  @ExcludeField()
  documentType: DocumentType;

  @ManyToOne(() => Team)
  @JoinColumn({ name: "team_id" })
  @ExcludeField()
  team: Team;

  @OneToMany(() => DocumentVersion, (version) => version.document)
  @ExcludeField()
  versions: DocumentVersion[];

  @Column({ name: "current_version", default: 1 })
  currentVersion: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  @ExcludeField()
  createdBy: User;

  @Column({ name: "approval_date", type: "bigint", default: 0 })
  approvalDate: number;

  @Column({ name: "approval_due_date", type: "bigint", default: 0 })
  approvalDueDate: number;

  @Column({ name: "obsolete_due_date", type: "bigint", default: 0 })
  obsoleteDate: number;

  @ManyToOne(() => ApprovalStrategy, { onDelete: "CASCADE" })
  @JoinColumn({ name: "approval_strategy_id" })
  @ExcludeField()
  approvalStrategy: ApprovalStrategy;

  @ManyToOne(() => DocumentAcknowledgement, { onDelete: "CASCADE" })
  @JoinColumn({ name: "document_acknowledgement_id" })
  @ExcludeField()
  documentAcknowledgement: DocumentAcknowledgement | null;

  @OneToMany(() => DocumentComment, (comment) => comment.document)
  @ExcludeField()
  comments: DocumentComment[];

  @OneToMany(() => DocumentContributor, (contributor) => contributor.document)
  @ExcludeField()
  contributors: DocumentContributor[];

  @Column({ type: "tinyint", default: 0 })
  deleted: boolean;

  @OneToMany(
    () => ChangeRequestDocument,
    (changeRequestDocument) => changeRequestDocument.document,
  )
  @ExcludeField()
  changeRequestDocuments: ChangeRequestDocument[];

  @Column({
    name: "content_type",
    type: "enum",
    enum: ContentType,
    default: ContentType.FILE,
    nullable: true,
  })
  contentType: ContentType | null;

  @ManyToOne(() => DocumentTemplate, { nullable: true })
  @JoinColumn({ name: "document_template_id" })
  @ExcludeField()
  documentTemplate: DocumentTemplate | null;
}
