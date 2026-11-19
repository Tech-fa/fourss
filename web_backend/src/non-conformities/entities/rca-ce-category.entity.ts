import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RootCauseAnalysis } from './root-cause-analysis.entity';
import { User } from '../../user/user.entity';
import { RCACeCause } from './rca-ce-cause.entity';

@Entity('rca_ce_categories')
export class RCACeCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'display_order', default: 0, nullable: true })
  displayOrder: number;

  @ManyToOne(
    () => RootCauseAnalysis,
    (rootCauseAnalysis) => rootCauseAnalysis.rcaCeCategories,
  )
  @JoinColumn({ name: 'root_cause_analysis_id' })
  rootCauseAnalysis: RootCauseAnalysis;

  @Column({ name: 'root_cause_analysis_id' })
  rootCauseAnalysisId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(() => RCACeCause, (rcaCeCause) => rcaCeCause.rcaCeCategory, {
    cascade: true,
  })
  rcaCeCauses: RCACeCause[];
}
