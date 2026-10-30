import {
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  Column,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => TeamMember, (member) => member.team, { cascade: true })
  members: TeamMember[];

  static getName(): string {
    return 'teams';
  }
}
