import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { NCCorrectiveAction } from './nc-corrective-action.entity';
import { User } from '../../user/user.entity';

export enum CaChangeRequestType {
    DUE_DATE_CHANGE = 'DUE_DATE_CHANGE',
    ASSIGNEE_CHANGE = 'ASSIGNEE_CHANGE',
}

export enum CaChangeRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

@Entity('ca_change_requests')
export class CaChangeRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => NCCorrectiveAction, (ca) => ca.changeRequests)
    @JoinColumn({ name: 'ca_id' })
    ca: NCCorrectiveAction;

    @Column({ name: 'ca_id' })
    caId: string;

    @Column({ name: 'title', type: 'text' })
    title: string;

    @Column({ type: 'enum', enum: CaChangeRequestType })
    type: CaChangeRequestType;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'requested_by_id' })
    requestedBy: User;

    @Column({ name: 'requested_by_id' })
    requestedById: string;

    @Column({ name: 'new_due_date', type: 'bigint', nullable: true })
    newDueDate: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'new_assignee_id' })
    newAssignee: User | null;

    @Column({ name: 'new_assignee_id', nullable: true })
    newAssigneeId: string;

    @Column({ name: 'reason', type: 'text'})
    reason: string;

    @Column({ name: 'status', type: 'enum', enum: CaChangeRequestStatus })
    status: CaChangeRequestStatus;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'reviewed_by_id' })
    reviewedBy: User;

    @Column({ name: 'reviewed_by_id', nullable: true })
    reviewedById: string;

    @Column({ name: 'reviewed_at', type: 'bigint', nullable: true })
    reviewedAt: number;

    @Column({ name: 'deleted', default: false })
    deleted: boolean;
}