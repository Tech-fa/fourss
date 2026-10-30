import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';
import { Document } from './document.entity';

@Entity('document_templates')
@Unique(['title'])
export class DocumentTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'text' })
    content: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @Column({ name: 'created_at', type: 'bigint' })
    createdAt: number;

    @Column({ name: 'updated_at', type: 'bigint' })
    updatedAt: number;

    @Column({ name: 'is_default', default: false })
    isDefault: boolean;

    @Column({ name: 'deleted', default: false })
    deleted: boolean;

    @OneToMany(() => Document, (document) => document.documentTemplate)
    documents: Document[];
}