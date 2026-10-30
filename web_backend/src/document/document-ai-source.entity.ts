import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ContentType, Document } from './document.entity';
import { DocumentVersion } from './document-version.entity';

export enum DocumentAiIndexStatus {
  PENDING = 'pending',
  READY = 'ready',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

export enum DocumentAiSourceKind {
  CHECKLIST = 'checklist',
  DOCX = 'docx',
  PDF = 'pdf',
  IMAGE = 'image',
  UNSUPPORTED = 'unsupported',
}

@Entity('document_ai_sources')
@Unique('UQ_document_ai_sources_version', ['documentVersionId'])
export class DocumentAiSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'document_id' })
  @Index()
  documentId: string;

  @ManyToOne(() => DocumentVersion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: DocumentVersion;

  @Column({ name: 'document_version_id' })
  documentVersionId: number;

  @Column({ name: 'team_id', type: 'int' })
  @Index()
  teamId: number;

  @Column({ type: 'tinyint', default: 0, name: 'is_public' })
  isPublic: boolean;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ContentType,
    nullable: true,
  })
  contentType: ContentType | null;

  @Column({
    name: 'source_kind',
    type: 'enum',
    enum: DocumentAiSourceKind,
  })
  sourceKind: DocumentAiSourceKind;

  @Column({
    name: 'status',
    type: 'enum',
    enum: DocumentAiIndexStatus,
    default: DocumentAiIndexStatus.PENDING,
  })
  status: DocumentAiIndexStatus;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash: string | null;

  @Column({ name: 'full_text', type: 'mediumtext', nullable: true })
  fullText: string | null;

  @Column({ name: 'error', type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'extracted_at', type: 'bigint', nullable: true })
  extractedAt: number | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
}
