import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NonConformity } from './non-conformity.entity';
import { RootCauseAnalysis } from './root-cause-analysis.entity';

@Entity('rca_fivewhy_steps')
export class RCAFiveWhyStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @JoinColumn({ name: 'rca_id' })
  @ManyToOne(() => RootCauseAnalysis, (rca) => rca.rcaFiveWhySteps)
  rca: RootCauseAnalysis;

  @Column({ name: 'step_number', nullable: true })
  stepNumber: number;

  @Column({ name: 'why_question' })
  whyQuestion: string;

  @Column({ name: 'because_answer', type: 'text' })
  becauseAnswer: string;
}