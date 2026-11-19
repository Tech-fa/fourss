import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChecklistDefinition } from './checklist-definition.entity';
import { Team } from '../../teams/team.entity';

@Entity('checklist_definition_teams')
export class ChecklistDefinitionTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChecklistDefinition, { nullable: false })
  @JoinColumn({ name: 'checklist_definition_id' })
  checklistDefinition: ChecklistDefinition;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
