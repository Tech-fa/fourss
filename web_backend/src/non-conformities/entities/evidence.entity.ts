import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';

@Entity('evidence')
export class Evidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NonConformity, { nullable: false })
  @JoinColumn({ name: 'nc_id' })
  nc: NonConformity;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_at', type: 'bigint' })
  uploadedAt: number;
} 