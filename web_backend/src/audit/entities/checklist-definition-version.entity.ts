import { User } from '../../user/user.entity';
import { ChecklistDefinition } from './checklist-definition.entity';
import { ChecklistSectionDefinition } from './checklist-section-definition.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum ChecklistVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

@Entity('checklist_definition_versions')
export class ChecklistDefinitionVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChecklistDefinition, { nullable: false })
  @JoinColumn({ name: 'checklist_definition_id' })
  checklistDefinition: ChecklistDefinition;

  @Column({ name: 'checklist_definition_id', type: 'varchar' })
  checklistDefinitionId: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'enum', enum: ChecklistVersionStatus, default: ChecklistVersionStatus.DRAFT })
  status: ChecklistVersionStatus;


  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id', type: 'varchar' })
  createdById: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @OneToMany(
    () => ChecklistSectionDefinition,
    (section) => section.checklistDefinitionVersion,
    { cascade: true },
  )
  sections: ChecklistSectionDefinition[];
} 