import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { NonConformity } from './non-conformity.entity';
@Entity('non_conformity_risk_levels')
@Unique(['name'])
export class NonConformityRiskLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'order', default: 0 })
  order: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(() => NonConformity, (nonConformity) => nonConformity.nonConformityRiskLevel)
  nonConformities: NonConformity[]; 
}