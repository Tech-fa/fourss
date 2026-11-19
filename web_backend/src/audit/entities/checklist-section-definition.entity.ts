import { User } from '../../user/user.entity';
import { ChecklistDefinitionVersion } from './checklist-definition-version.entity';
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
import { ChecklistQuestionDefinition } from './checklist-question-definition.entity';

@Entity('checklist_section_definitions')
export class ChecklistSectionDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChecklistDefinitionVersion, { nullable: false })
  @JoinColumn({ name: 'checklist_definition_version_id' })
  checklistDefinitionVersion: ChecklistDefinitionVersion;

  @Column({ name: 'checklist_definition_version_id', type: 'varchar' })
  checklistDefinitionVersionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;

  @OneToMany(
    () => ChecklistQuestionDefinition,
    (question) => question.sectionDefinition,
    { cascade: true },
  )
  questions: ChecklistQuestionDefinition[];

  @ManyToOne(() => ChecklistSectionDefinition, { nullable: true })
  @JoinColumn({ name: 'parent_section_id' })
  parentSection?: ChecklistSectionDefinition | null;

  @Column({ name: 'parent_section_id', type: 'varchar', nullable: true })
  parentSectionId?: string | null;

  @OneToMany(
    () => ChecklistSectionDefinition,
    (section) => section.parentSection,
    { cascade: true },
  )
  subsections?: ChecklistSectionDefinition[];
}
