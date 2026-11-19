import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique, PrimaryColumn } from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('audit_roles')
@Unique(['name'])
export class AuditRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
} 