import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { ChangeRequestDocument } from './change-request-document.entity';
import { Team } from '../teams/team.entity';

export enum ChangeRequestStatus {
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('change_requests')
export class ChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;


  @Column({ type: 'text', nullable: true })
  title: string;
  
  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'risk_identified', type: 'text', nullable: true })
  risks: string;

  @Column({ type: 'enum', enum: ChangeRequestStatus, default: ChangeRequestStatus.ACTIVE })
  status: ChangeRequestStatus;

  @OneToMany(() => ChangeRequestDocument, (changeRequestDocument) => changeRequestDocument.changeRequest, {
    cascade: true,
  })
  documents: ChangeRequestDocument[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by' })
  requestedBy: User;
  
  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  teamId: number;

  @Column({ name: 'requested_by' })
  requestedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedById: string;

  @Column({ name: 'reviewed_at', type: 'bigint', nullable: true })
  reviewedAt: number;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 