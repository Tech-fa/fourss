import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { ImmediateAction } from './immediate-action.entity';

@Entity('immediate_action_evidence')
export class ImmediateActionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ImmediateAction, (immediateAction) => immediateAction.evidence, { nullable: false })
  @JoinColumn({ name: 'immediate_action_id' })
  immediateAction: ImmediateAction;

  @Column({ name: 'filename', type: 'text' })
  filename: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;
}
