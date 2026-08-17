import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

import { MessageStatus } from "../enums.js";
import type { Conversation } from "./Conversation.js";
import type { User } from "./User.js";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("text")
  content!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  sender!: Relation<User>;

  @ManyToOne("Conversation", "messages", { onDelete: "CASCADE" })
  conversation!: Relation<Conversation>;

  @CreateDateColumn({ name: "sent_at" })
  sentAt!: Date;

  @Column({ name: "delivered_at", type: "timestamptz", nullable: true })
  deliveredAt!: Date;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt!: Date;

  @Column({ type: "enum", enum: MessageStatus, default: MessageStatus.SENT })
  status!: MessageStatus;

  @ManyToOne("Message", { nullable: true, onDelete: "SET NULL" })
  replyTo!: Relation<Message>;
}
