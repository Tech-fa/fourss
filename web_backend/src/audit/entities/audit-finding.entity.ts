import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuditTeamMember } from './audit-team-member.entity';
import { AuditFindingEvidence } from './audit-finding-evidence.entity';
import { AuditChecklistResponse } from './audit-checklist-response.entity';
import { AuditInstance } from './audit-instance.entity';
import { NonConformity } from '../../non-conformities/entities/non-conformity.entity';

export enum AuditFindingClassification {
    NON_CONFORMITY = 'NON_CONFORMITY',
    OBSERVATION = 'OBSERVATION',
    OPPORTUNITY = 'OPPORTUNITY_FOR_IMPROVEMENT',
}

 

@Entity('audit_findings')
@Unique(['title', 'auditInstance'])
export class AuditFinding {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'title', type: 'varchar', length: 255 })
    title: string;

    @Column({ name: 'description', type: 'text', nullable:true })
    description: string | null;

    @Column({
        type: 'enum',
        enum: AuditFindingClassification,
        default: AuditFindingClassification.NON_CONFORMITY,
    })
    classification: AuditFindingClassification;

    

    //NC
    @Column({ name: 'raised_nc', type: 'boolean', default: false })
    raisedNc: boolean;

    @OneToOne(() => NonConformity, { nullable: true })
    @JoinColumn({ name: 'non_conformity' })
    nonConformity: NonConformity | null;

    @OneToMany(() => AuditFindingEvidence, (evidence) => evidence.auditFinding, {
        cascade: true,
    })
    auditFindingEvidences: AuditFindingEvidence[];

    @ManyToOne(() => AuditInstance, { nullable: false })
    @JoinColumn({ name: 'audit_instance_id' })
    auditInstance: AuditInstance;

    @ManyToOne(() => AuditChecklistResponse, { nullable: true })
    @JoinColumn({ name: 'audit_checklist_response_id' })
    auditChecklistResponse: AuditChecklistResponse | null;

    @ManyToOne(() => AuditTeamMember, { nullable: true })
    @JoinColumn({ name: 'audit_team_member_id' })
    auditTeamMember: AuditTeamMember | null;

    @Column({ name: 'created_at', type: 'bigint' })
    createdAt: number;
}