import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { NCCustomFieldValue } from './nc-custom-field-value.entity';

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  FILE_UPLOAD = 'fileUpload',
  MULTI_SELECT = 'multiSelect',
}

@Entity('nc_category_custom_fields')
export class CategoryCustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Category, (category) => category.customFields, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ nullable: false })
  label: string;

  @Column({
    type: 'enum',
    enum: CustomFieldType,
    name: 'field_type',
    nullable: false,
  })
  fieldType: CustomFieldType;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Options for dropdown and multiSelect field types'
  })
  options: string | null;

  @Column({ 
    type: 'text', 
    nullable: true,
    name: 'accepted_files',
    comment: 'Accepted file types for fileUpload field type'
  })
  acceptedFiles: string | null;

  @OneToMany(() => NCCustomFieldValue, (customFieldValue) => customFieldValue.customField, {
    cascade: true,
  })
  customFieldValues: NCCustomFieldValue[];
} 