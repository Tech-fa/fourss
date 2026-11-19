import { User } from '../../user/user.entity';
import { ChecklistSectionDefinition } from './checklist-section-definition.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('checklist_question_definitions')
export class ChecklistQuestionDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChecklistSectionDefinition, { nullable: false })
  @JoinColumn({ name: 'section_definition_id' })
  sectionDefinition: ChecklistSectionDefinition;

  @Column({ name: 'section_definition_id', type: 'varchar' })
  sectionDefinitionId: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'question_type', type: 'varchar', length: 100 })
  questionType: string;

  @Column({ type: 'text', nullable: true })
  reference?: string;

  @Column({ name: 'guidance_notes', type: 'text', nullable: true })
  guidanceNotes?: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  createdBy: User;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt: number;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt: number;
} 