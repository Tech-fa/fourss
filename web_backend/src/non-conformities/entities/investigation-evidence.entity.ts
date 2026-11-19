import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { Investigation } from './investigation.entity';

@Entity('investigation_evidence')
export class InvestigationEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Investigation, { nullable: false })
  @JoinColumn({ name: 'investigation_id' })
  investigation: Investigation;

  @Column({ name: 'investigation_id' })
  investigationId: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  @Column({ name: 'uploaded_at', type: 'bigint' })
  uploadedAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 