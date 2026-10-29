import { Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Comment } from '../common/comment.entity';
import { Document } from './document.entity';

@Entity('document_comments')
export class DocumentComment {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => Document, (document) => document.comments)
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
