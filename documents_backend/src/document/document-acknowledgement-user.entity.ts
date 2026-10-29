import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { DocumentAcknowledgement } from './document-acknowledgement.entity';

@Entity('document_acknowledgement_users')
export class DocumentAcknowledgementUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => DocumentAcknowledgement)
  @JoinColumn({ name: 'acknowledgement_id' })
  acknowledgement: DocumentAcknowledgement;
}
