import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditInstance } from './audit-instance.entity';
import { ChecklistDefinitionVersion } from './checklist-definition-version.entity';

@Entity('audit_instance_checklist_versions')
export class AuditInstanceChecklistVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => AuditInstance, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'audit_instance_id' })
    auditInstance: AuditInstance;

    @ManyToOne(() => ChecklistDefinitionVersion, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'checklist_definition_version_id' })
    checklistDefinitionVersion: ChecklistDefinitionVersion;
}