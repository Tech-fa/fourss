import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChangeRequest } from './change-request.entity';
import { Document } from './document.entity';

@Entity('change_request_documents')
export class ChangeRequestDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ChangeRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'change_request_id' })
  changeRequest: ChangeRequest;

  @Column({ name: 'change_request_id' })
  changeRequestId: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'document_id' })
  documentId: string;

}

