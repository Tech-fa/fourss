import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique, PrimaryColumn } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('audit_document_types')
@Unique(['name'])
export class AuditDocumentType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 