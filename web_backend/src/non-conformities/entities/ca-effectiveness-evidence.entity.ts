import { User } from "../../user/user.entity";
import { NCCorrectiveAction } from "./nc-corrective-action.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('ca_effectiveness_evidence')
export class CaEffectivenessEvidence {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => NCCorrectiveAction, (ca) => ca.effectivenessEvidences)
    @JoinColumn({ name: 'ca_id' })
    ca: NCCorrectiveAction;

    @Column({ name: 'ca_id' })
    caId: string;

    @Column({ name: 'file_url' })
    fileUrl: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'uploaded_by_id' })
    uploadedBy: User;

    @Column({ name: 'uploaded_by_id' })
    uploadedById: string;

    @Column({ name: 'uploaded_at', type: 'bigint', nullable: true })
    uploadedAt: number;

    @Column({ name: 'deleted', default: false })
    deleted: boolean;
}