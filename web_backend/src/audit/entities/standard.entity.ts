import { User } from '../../user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('standards')
@Unique(['name'])
export class Standard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'deleted', type: 'boolean', default: false })
  deleted: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
}
