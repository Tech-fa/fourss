import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { NonConformity } from './non-conformity.entity';
import { User } from '../../user/user.entity';

@Entity('non_conformity_representatives')
@Unique(['email'])
export class NonConformityRepresentative {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'is_external', default: false })
  isExternal: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;

  @OneToMany(
    () => NonConformity,
    (NonConformityValue) => NonConformityValue.representative,
    {
      cascade: true,
    },
  )
  nonConformities: NonConformity[];
}
