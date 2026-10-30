import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Document } from "../document/document.entity";
import { StandardImplementation } from "./standard-implementation.entity";
import {
  ImplementationDocumentStatus,
  RequiredDocumentKind,
} from "./standards.enums";

@Entity("standard_implementation_documents")
@Unique("UQ_implementation_document_key", ["implementationId", "documentKey"])
export class StandardImplementationDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StandardImplementation, (implementation) => implementation.documents, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "implementation_id" })
  implementation: StandardImplementation;

  @Column({ name: "implementation_id" })
  implementationId: number;

  @Column({ name: "document_key", type: "varchar", length: 128 })
  documentKey: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 32 })
  clause: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "enum", enum: RequiredDocumentKind })
  kind: RequiredDocumentKind;

  @Column({
    type: "enum",
    enum: ImplementationDocumentStatus,
    default: ImplementationDocumentStatus.NOT_STARTED,
  })
  status: ImplementationDocumentStatus;

  @ManyToOne(() => Document, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "linked_document_id" })
  linkedDocument: Document | null;

  @Column({ name: "linked_document_id", type: "varchar", length: 255, nullable: true })
  linkedDocumentId: string | null;

  @Column({ name: "sort_order", type: "int" })
  sortOrder: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;
}
