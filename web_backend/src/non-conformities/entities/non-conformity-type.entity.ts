import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';

@Entity('non_conformity_types')
@Unique(['name'])
export class NonConformityType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(() => NonConformity, (nonConformity) => nonConformity.nonConformityType)
  nonConformities: NonConformity[];
}