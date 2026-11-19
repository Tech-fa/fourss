import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditInstance } from './audit-instance.entity';
import { ChecklistQuestionDefinition } from './checklist-question-definition.entity';
import { AuditTeamMember } from './audit-team-member.entity';
import { AuditFinding } from './audit-finding.entity';

@Entity('audit_checklist_responses')
export class AuditChecklistResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditInstance, { nullable: false })
  @JoinColumn({ name: 'audit_instance_id' })
  auditInstance: AuditInstance;

  @ManyToOne(() => ChecklistQuestionDefinition, { nullable: false })
  @JoinColumn({ name: 'question_definition_id' })
  questionDefinition: ChecklistQuestionDefinition;

  @Column({ name: 'response_answer', type: 'text', nullable: true })
  responseAnswer?: string;

  @Column({ name: 'auditor_observation', type: 'text', nullable: true })
  auditorObservation?: string;

  @ManyToOne(() => AuditTeamMember, { nullable: true })
  @JoinColumn({ name: 'responded_by_team_member_id' })
  respondedByTeamMember?: AuditTeamMember;

  @OneToMany(() => AuditFinding, (finding) => finding.auditChecklistResponse)
  auditFindings?: AuditFinding[];

  @Column({ name: 'responded_at', type: 'bigint', nullable: true })
  respondedAt?: number;
}