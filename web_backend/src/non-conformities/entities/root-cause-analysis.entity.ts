import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';
import { RCAFiveWhyStep } from './rca-fivewhy-step.entity';
import { RCACeCategory } from './rca-ce-category.entity';
import { RCAFishbone } from './rca-fishbone.entity';
import { RootCauseAnalysisPerformer } from './root-cause-analysis-performer.entity';

export enum RCAMethod {
  FISHBONE = 'Fishbone',
  CAUSE_EFFECT = 'CauseEffect',
  FIVE_WHYS = 'FiveWhys'
}

@Entity('root_cause_analyses')
export class RootCauseAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NonConformity, { nullable: false })
  @JoinColumn({ name: 'nc_id' })
  nc: NonConformity;

  @Column({ name: 'nc_id' })
  ncId: string;

  @Column({
    type: 'enum',
    enum: RCAMethod,
    name: 'method'
  })
  method: RCAMethod;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @Column({ name: 'performed_by_id', nullable: true })
  performedById: string;

  @OneToMany(() => RootCauseAnalysisPerformer, (rootCauseAnalysisPerformer) => rootCauseAnalysisPerformer.rootCauseAnalysis, { cascade: true })
  rootCauseAnalysisPerformers: RootCauseAnalysisPerformer[];

  @Column({ name: 'performed_at', type: 'bigint', nullable: true })
  performedAt: number | null;

  @Column({ name: 'problem_statement', type: 'text', nullable: true })
  problemStatement: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @OneToMany(() => RCAFiveWhyStep, (rcaFiveWhyStep) => rcaFiveWhyStep.rca, { cascade: true })
  rcaFiveWhySteps: RCAFiveWhyStep[];
  @OneToMany(() => RCACeCategory, (rcaCeCategory) => rcaCeCategory.rootCauseAnalysis, { cascade: true })
  rcaCeCategories: RCACeCategory[];

  @OneToOne(() => RCAFishbone, (rcaFishbone) => rcaFishbone.rootCauseAnalysis, { cascade: true })
  rcaFishbone: RCAFishbone;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;
} 