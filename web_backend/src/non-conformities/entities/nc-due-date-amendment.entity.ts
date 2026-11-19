import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';

@Entity('nc_due_date_amendments')
export class NcDueDateAmendment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NonConformity, (nc) => nc.dueDateAmendments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'non_conformity_id' })
  nonConformity: NonConformity;

  @Column({ name: 'non_conformity_id' })
  nonConformityId: string;

  @Column({ name: 'previous_due_date', type: 'bigint' })
  previousDueDate: number;

  @Column({ name: 'new_due_date', type: 'bigint' })
  newDueDate: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'amended_by_id' })
  amendedBy: User;

  @Column({ name: 'amended_by_id' })
  amendedById: string;

  @Column({ name: 'amended_at', type: 'bigint' })
  amendedAt: number;
}
