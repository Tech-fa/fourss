import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CategoryCustomField } from './category-custom-field.entity';
import { NonConformity } from './non-conformity.entity';

@Entity('nc_custom_field_values')
export class NCCustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CategoryCustomField, (customField) => customField.customFieldValues, { nullable: false })
  @JoinColumn({ name: 'custom_field_id' })
  customField: CategoryCustomField;

  @Column({ type: 'text', nullable: true })
  value: string;

  @ManyToOne(() => NonConformity, (nonConformity) => nonConformity.customFieldValues, { nullable: true })
  @JoinColumn({ name: 'non_conformity_id' })
  nonConformity: NonConformity;
} 