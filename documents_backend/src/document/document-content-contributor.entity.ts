import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../user/user.entity";
import { Document } from "./document.entity";

@Entity("document_content_contributors")
@Unique("UQ_document_content_contributors_document_user", [
  "documentId",
  "userId",
])
export class DocumentContentContributor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "document_id" })
  documentId: string;

  @ManyToOne(() => Document, (document) => document.contentContributors, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "document_id" })
  document: Document;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
