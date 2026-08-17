import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

import type { Conversation } from "./Conversation.js";
import type { User } from "./User.js";

import { MessageStatus } from "../enums.js";

@Entity("messages")
export class Message {
  @Column("text")
  content!: string;

  @ManyToOne("Conversation", "messages", { onDelete: "CASCADE" })
  conversation!: Relation<Conversation>;

  @Column({ name: "delivered_at", nullable: true, type: "timestamptz" })
  deliveredAt!: Date;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "read_at", nullable: true, type: "timestamptz" })
  readAt!: Date;

  @ManyToOne("Message", { nullable: true, onDelete: "SET NULL" })
  replyTo!: Relation<Message>;

  @ManyToOne("User", { onDelete: "CASCADE" })
  sender!: Relation<User>;

  @CreateDateColumn({ name: "sent_at" })
  sentAt!: Date;

  @Column({ default: MessageStatus.SENT, enum: MessageStatus, type: "enum" })
  status!: MessageStatus;
}
