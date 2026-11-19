import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { RCACeCategory } from './rca-ce-category.entity';

@Entity('rca_ce_causes')
export class RCACeCause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'text' })
  text: string;

  @Column({ name: 'display_order', default: 0, nullable: true })
  displayOrder: number;

  @ManyToOne(() => RCACeCategory, (rcaCeCategory) => rcaCeCategory.rcaCeCauses)
  @JoinColumn({ name: 'rca_ce_category_id' })
  rcaCeCategory: RCACeCategory;

  @ManyToOne(() => RCACeCause, (cause) => cause.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: RCACeCause;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @OneToMany(() => RCACeCause, (cause) => cause.parent, { cascade: true })
  children?: RCACeCause[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;
}
