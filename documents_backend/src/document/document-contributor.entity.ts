import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Column,
  } from 'typeorm';
  import { User } from '../user/user.entity';   
  import { Document } from './document.entity';
  import { DocumentAction } from './document-action.entity';
import { DocumentVersion } from './document-version.entity';
  
  export enum ContributorType {
    APPROVER = 'approver',
    REVIEWER = 'reviewer',
    VIEWER = 'viewer',
    CONTRIBUTOR = 'contributor',
  }
  
  @Entity('document_contributors')
  export class DocumentContributor {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
  
    @ManyToOne(() => Document)
    @JoinColumn({ name: 'document_id' })
    document: Document;

    @ManyToOne(() => DocumentVersion)
    @JoinColumn({ name: 'document_version_id' })
    documentVersion: DocumentVersion;

    @Column({ name: 'document_version_id', type: 'int' })
    documentVersionId: number;
  
    @OneToMany(() => DocumentAction, (action) => action.documentContributor, {
      cascade: true,
    })
    actions: DocumentAction[];
  }
  