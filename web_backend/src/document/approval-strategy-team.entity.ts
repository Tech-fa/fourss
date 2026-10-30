import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Team } from '../teams/team.entity';
import { ApprovalStrategy } from './approval-strategy.entity';

@Entity('approval_strategy_teams')
export class ApprovalStrategyTeam {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ApprovalStrategy)
  @JoinColumn({ name: 'strategy_id' })
  strategy: ApprovalStrategy;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
