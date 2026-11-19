import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { User } from '../../user/user.entity';
import { RootCauseAnalysis } from './root-cause-analysis.entity';

@Entity('root_cause_analysis_performers')
export class RootCauseAnalysisPerformer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => RootCauseAnalysis)
    @JoinColumn({ name: 'root_cause_analysis_id' })
    rootCauseAnalysis: RootCauseAnalysis;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}