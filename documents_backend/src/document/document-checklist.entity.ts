import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { DocumentVersion } from "./document-version.entity";
import { DocumentChecklistQuestion } from "./document-checklist-question.entity";
import type { CreateDocumentChecklistDto } from "./dtos";

@Entity("document_checklists")
export class DocumentChecklist {
  constructor(dto?: CreateDocumentChecklistDto) {
    if (dto?.questions) {
      this.questions = dto.questions.map(
        (question, index) =>
          new DocumentChecklistQuestion({
            ...question,
            orderIndex: question.orderIndex ?? index,
          }),
      );
    }
  }

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => DocumentVersion, (version) => version.checklist, {
    nullable: true,
  })
  @JoinColumn({ name: "document_version_id" })
  documentVersion: DocumentVersion;

  @Column({ name: "document_version_id", nullable: true })
  documentVersionId: number;

  @OneToMany(
    () => DocumentChecklistQuestion,
    (question) => question.checklist,
    { cascade: true },
  )
  questions: DocumentChecklistQuestion[];

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;
}
