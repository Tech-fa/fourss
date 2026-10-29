import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DocumentChecklist } from "./document-checklist.entity";
import type { DocumentChecklistQuestionDto } from "./dtos";

export enum DocumentChecklistQuestionType {
  YES_NO = "YES_NO",
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  TEXTAREA = "TEXTAREA",
  IMAGE = "IMAGE",
  FILE = "FILE",
}

@Entity("document_checklist_questions")
export class DocumentChecklistQuestion {
  constructor(dto: DocumentChecklistQuestionDto) {
    this.questionText = dto?.question;
    this.questionType = dto?.questionType;
    this.orderIndex = dto?.orderIndex;
    this.required = dto?.required;
  }
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => DocumentChecklist, (checklist) => checklist.questions, {
    nullable: true,
  })
  @JoinColumn({ name: "document_checklist_id" })
  checklist: DocumentChecklist;

  @Column({ name: "document_checklist_id", type: "varchar", nullable: true })
  documentChecklistId: string;

  @Column({ name: "question_text", type: "text" })
  questionText: string;

  @Column({ name: "required", type: "boolean", default: false })
  required: boolean;

  @Column({
    name: "question_type",
    type: "enum",
    enum: DocumentChecklistQuestionType,
  })
  questionType: DocumentChecklistQuestionType;

  @Column({ name: "order_index", type: "int" })
  orderIndex: number;

  @Column({ name: "created_at", type: "bigint" })
  createdAt: number;

  @Column({ name: "updated_at", type: "bigint" })
  updatedAt: number;
}
