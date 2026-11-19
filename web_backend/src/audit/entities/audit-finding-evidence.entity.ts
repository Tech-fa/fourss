import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { AuditFinding } from './audit-finding.entity';
import { Document } from '../../document/document.entity';
import { AuditTeamMember } from './audit-team-member.entity';

export enum AuditFindingEvidenceType {
    DOCUMENT = 'DOCUMENT',
    AUDIT_EVIDENCE_FILE = 'AUDIT_EVIDENCE_FILE',
}

@Entity('audit_finding_evidences')
export class AuditFindingEvidence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'description', type: 'varchar', length: 255, nullable:true })
    description: string;

    @ManyToOne(() => AuditFinding)
    @JoinColumn({ name: 'audit_finding_id' })
    auditFinding: AuditFinding;

    @Column({
        type: 'enum',
        enum: AuditFindingEvidenceType,
        default: AuditFindingEvidenceType.AUDIT_EVIDENCE_FILE,
    })
    evidenceType: AuditFindingEvidenceType;

    @Column({ type: 'varchar', nullable: true, name: 'audit_evidence_file_url' })
    evidenceFileUrl: string | null;

    @ManyToOne(() => Document, { nullable: true })
    @JoinColumn({ name: 'audit_evidence_document_id' })
    document: Document | null;
}