import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from "typeorm";
import { User } from "../../user/user.entity";

@Entity("user_notifications")
export class UserNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ default: false })
  viewed: boolean;

  @Column({ type: "json" })
  data: { [key: string]: any };

  @Column({ type: "bigint" })
  createdAt: number;
}
