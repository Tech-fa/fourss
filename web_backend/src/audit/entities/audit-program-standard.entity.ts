import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditProgram } from './audit-program.entity';
import { Standard } from './standard.entity';

@Entity('audit_program_standards')
export class AuditProgramStandard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AuditProgram, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_program_id' })
  auditProgram: AuditProgram;

  @ManyToOne(() => Standard, { nullable: false })
  @JoinColumn({ name: 'standard_id' })
  standard: Standard;

  @Column({ name: 'standard_id', type: 'varchar' })
  standardId: string;
}
