import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ImmediateAction } from './immediate-action.entity';

export enum ImmediateActionCommentType {
  USER = 'user',
  REJECTION = 'rejection',
}

@Entity('immediate_action_comments')
export class ImmediateActionComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ImmediateAction, (immediateAction) => immediateAction.comments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'immediate_action_id' })
  immediateAction: ImmediateAction;

  @Column({ type: 'text' })
  text: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ImmediateActionCommentType,
    default: ImmediateActionCommentType.USER,
  })
  type: ImmediateActionCommentType;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;
}
