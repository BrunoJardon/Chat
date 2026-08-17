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

import type { Message } from "./Message.js";
import type { User } from "./User.js";

import { ConversationType } from "../enums.js";

@Entity("conversations")
export class Conversation {
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne("User", { nullable: true, onDelete: "SET NULL" })
  createdBy!: Relation<User>;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToMany("Message", "conversation")
  messages!: Relation<Message[]>;

  @Column({ type: "varchar", nullable: true })
  name!: string;

  @JoinTable({
    inverseJoinColumn: { name: "user_id" },
    joinColumn: { name: "conversation_id" },
    name: "conversation_participants",
  })
  @ManyToMany("User", "conversations")
  participants!: Relation<User[]>;

  @Column({ default: ConversationType.DIRECT, enum: ConversationType, type: "enum" })
  type!: ConversationType;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
