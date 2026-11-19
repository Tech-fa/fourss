import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { NonConformity } from './non-conformity.entity';
import { RootCauseAnalysis } from './root-cause-analysis.entity';

export enum InvestigationAction {
  CLOSE = 'close',
  OPEN_CA = 'openCA',
  OPEN_RCA = 'openRCA',
  NONE = 'none'
}

@Entity('investigations')
export class Investigation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NonConformity, { nullable: false })
  @JoinColumn({ name: 'nc_id' })
  nc: NonConformity;

  @Column({ name: 'nc_id' })
  ncId: string;

  @Column({
    type: 'enum',
    enum: InvestigationAction,
    name: 'action',
    nullable: true
  })
  action: InvestigationAction | null;

  @ManyToOne(() => RootCauseAnalysis, { nullable: true })
  @JoinColumn({ name: 'root_ca_id' })
  rootCA: RootCauseAnalysis | null;

  @Column({ name: 'root_ca_id', nullable: true })
  rootCAId: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 