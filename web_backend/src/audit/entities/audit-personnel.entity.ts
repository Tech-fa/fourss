import { User } from '../../user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('audit_personnels')
@Unique(['email'])
export class AuditPersonnel {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'first_name', type: 'varchar', length: 255})
    firstName: string;

    @Column({ name: 'last_name', type: 'varchar', length: 255})
    lastName: string;

    @Column({ name: 'email', type: 'varchar', length: 255})
    email: string;

    @Column({ name: 'is_external', default: false })
    isExternal: boolean;

    @Column({ name: 'is_active', default: false })
    isActive: boolean;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'user_id', type: 'varchar', nullable: true })
    userId: string | null;
  
    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: User;

    @Column({ name: 'deleted', type: 'boolean', default: false })
    deleted: boolean;
}
