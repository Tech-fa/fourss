import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('files')
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'file_url', type: 'text' })
    fileUrl: string;

    @Column({ name: 'file_name', type: 'text' })
    fileName: string;

    @Column({ name: 'content_type', type: 'varchar', length: 255, nullable: true })
    contentType: string | null;
}