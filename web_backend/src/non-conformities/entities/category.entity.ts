import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CategoryCustomField } from './category-custom-field.entity';
import { NonConformity } from './non-conformity.entity';
import { User } from '../../user/user.entity';

@Entity('nc_categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent, {
    cascade: true,
  })
  children: Category[];

  @OneToMany(() => CategoryCustomField, (customField) => customField.category, {
    cascade: true,
  })
  customFields: CategoryCustomField[];

  @OneToMany(() => NonConformity, (nonConformity) => nonConformity.category, {
    cascade: true,
  })
  nonConformities: NonConformity[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'deleted', default: false })
  deleted: boolean;
} 