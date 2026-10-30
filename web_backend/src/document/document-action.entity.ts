import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    OneToOne,
  } from 'typeorm';
  import { DocumentContributor } from './document-contributor.entity';
    import { Comment } from '../common/comment.entity';
  
  export enum DocumentActionType {
    APPROVED = 'approved',
    REJECTED = 'rejected',
    SEND_FOR_REVIEW = 'send_for_review',
    REVIEWED = 'reviewed',
    REVIEWED_REJECTED = 'reviewed_rejected',
    READY_FOR_APPROVAL = 'ready_for_approval',
    CONTRIBUTED = 'contributed',
    COMMENTED = 'commented',
    PUBLISHED = 'published',
    MARKED_OBSOLETE = 'marked_obsolete',
    OVERRIDE_APPROVED = 'override_approved',
    ACKNOWLEDGED = 'acknowledged',
  }
  
  @Entity('document_actions')
  export class DocumentAction {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'enum', enum: DocumentActionType })
    type: DocumentActionType;
  
    @ManyToOne(() => DocumentContributor)
    @JoinColumn({ name: 'document_contributor_id' })
    documentContributor: DocumentContributor;
  
    @Column({ name: 'created_date', type: 'bigint' })
    createdDate: number;
  
    @OneToOne(() => Comment, { cascade: true })
    @JoinColumn({ name: 'comment_id' })
    comment: Comment;
    
  }
  