import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Document } from './document.entity';

@Entity('document_types')
@Unique(['name'])
@Unique(['categoryCode'])
export class DocumentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'category_code' })
  categoryCode: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;  

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ type: 'tinyint', default: 0 })
  deleted: boolean;

  @OneToMany(() => Document, (document) => document.documentType)
  documents: Document[];
}
