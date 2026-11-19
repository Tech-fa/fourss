import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { RootCauseAnalysis } from './root-cause-analysis.entity';

export interface FishboneCause {
    text: string;
    children?: FishboneCause[];
}

export interface FishboneCategory {
    name: string;
    causes: FishboneCause[];
}

@Entity('rca_fishbones')
export class RCAFishbone {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'root_cause_analysis_id' })
    rootCauseAnalysisId: string;

    @OneToOne(() => RootCauseAnalysis, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'root_cause_analysis_id' })
    rootCauseAnalysis: RootCauseAnalysis;

    @Column({ type: 'text', name: 'effect_statement', nullable: true })
    effectStatement: string;

    @Column({ type: 'json', name: 'categories', nullable: true })
    categories: FishboneCategory[];

    @Column({ name: 'created_at', type: 'bigint'   })
    createdAt: number;

    @Column({ name: 'updated_at', type: 'bigint' })
    updatedAt: number;
} 