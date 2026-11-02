import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PlaygroundRecord } from "./playground-record.entity";
import { Playground } from "./playground.entity";

@Entity("playground_references")
export class PlaygroundReference {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Playground, { onDelete: "CASCADE" })
  @JoinColumn({ name: "playground_id" })
  playground: Playground;

  @Column({ name: "playground_id", type: "varchar", length: 255 })
  playgroundId: string;

  @ManyToOne(() => PlaygroundRecord, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_record_id" })
  fromRecord: PlaygroundRecord;

  @Column({ name: "from_record_id", type: "varchar", length: 255 })
  fromRecordId: string;

  @Column({ name: "entity_type", type: "varchar", length: 64 })
  entityType: string;

  @Column({ name: "entity_id", type: "varchar", length: 255 })
  entityId: string;
}
