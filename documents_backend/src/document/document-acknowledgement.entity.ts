import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentAcknowledgementUnit } from './document-acknowledgement-unit.entity';
import { DocumentAcknowledgementUser } from './document-acknowledgement-user.entity';
import { DocumentType } from './document-type.entity';

@Entity('document_acknowledgements')
export class DocumentAcknowledgement {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(() => DocumentAcknowledgementUnit, (unit) => unit.acknowledgement, {
    cascade: true,
  })
  teams: DocumentAcknowledgementUnit[];

  /** Category-based acknowledgement. Mutually exclusive with teams. */
  @ManyToOne(() => DocumentType, { nullable: true })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  deleted: boolean;

  @OneToMany(
    () => DocumentAcknowledgementUser,
    (acknowledgementUser) => acknowledgementUser.acknowledgement,
    { cascade: true },
  )
  acknowledgementUsers: DocumentAcknowledgementUser[];

  @Column({ default: false, name: 'all_users' })
  allUsers: boolean;
}
