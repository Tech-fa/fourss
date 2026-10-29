import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from '../teams/team.entity';
import { DocumentAcknowledgement } from './document-acknowledgement.entity';

@Entity('document_acknowledgement_units')
export class DocumentAcknowledgementUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DocumentAcknowledgement)
  @JoinColumn({ name: 'acknowledgement_id' })
  acknowledgement: DocumentAcknowledgement;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
