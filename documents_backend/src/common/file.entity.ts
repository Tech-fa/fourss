import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('files')
export class File {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'file_url', type: 'text' })
    fileUrl: string;

    @Column({ name: 'file_name', type: 'text' })
    fileName: string;
}