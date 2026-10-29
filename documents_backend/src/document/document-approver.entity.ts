import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ApprovalStrategy } from './approval-strategy.entity';
@Entity('document_approvers')
export class DocumentApprover {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ['approver', 'reviewer'], name: 'role_type' })
  roleType: 'approver' | 'reviewer';

  @Column({ type: 'int', default: 1 })
  order: number;

  @ManyToOne(() => ApprovalStrategy)
  @JoinColumn({ name: 'strategy_id' })
  strategy: ApprovalStrategy;
}
