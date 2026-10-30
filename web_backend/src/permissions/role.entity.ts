import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
} from 'typeorm';
import { PermissionsDTO } from './dto';
import { TeamMember } from '../teams/team-member.entity';

@Entity('roles')
@Unique(['name'])
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'json' })
  permissions: PermissionsDTO[];

  @Column({ default: false })
  custom: boolean;

  @Column({ default: false })
  deleted: boolean;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.role)
  teamMembers: TeamMember[];

  /** Populated via loadRelationCountAndMap in list queries. */
  members?: number;

  @Column({ type: 'text', nullable: true })
  description: string;
}
