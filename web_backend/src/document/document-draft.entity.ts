import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentVersion } from './document-version.entity';
import { Document } from './document.entity';
import { User } from '../user/user.entity';

@Entity('document_drafts')
export class DocumentDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  //many to one document nullable
  @ManyToOne(() => Document, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document | null;

  @Column({ name: 'document_id', nullable: true })
  documentId: string | null;

  //many to one document version nullable
  @ManyToOne(() => DocumentVersion, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_version_id' })
  documentVersion: DocumentVersion | null;

  @Column({ name: 'document_version_id', nullable: true })
  documentVersionId: number | null;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
}
