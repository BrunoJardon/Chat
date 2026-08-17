import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from "typeorm";

import { ConversationType } from "../enums.js";
import type { Message } from "./Message.js";
import type { User } from "./User.js";

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: ConversationType, default: ConversationType.DIRECT })
  type!: ConversationType;

  @Column({ nullable: true })
  name!: string;

  @ManyToOne("User", { nullable: true, onDelete: "SET NULL" })
  createdBy!: Relation<User>;

  @ManyToMany("User", "conversations")
  @JoinTable({
    name: "conversation_participants",
    joinColumn: { name: "conversation_id" },
    inverseJoinColumn: { name: "user_id" },
  })
  participants!: Relation<User[]>;

  @OneToMany("Message", "conversation")
  messages!: Relation<Message[]>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
