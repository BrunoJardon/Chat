import { Column, CreateDateColumn, Entity, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from "typeorm";

import type { Conversation } from "./Conversation.js";
import type { Message } from "./Message.js";
import type { UserSession } from "./UserSession.js";
import type { UserSettings } from "./UserSettings.js";

@Entity("users")
export class User {
  @Column({ nullable: true, type: "varchar" })
  avatar!: string;

  @ManyToMany("Conversation", "participants")
  conversations!: Relation<Conversation[]>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  firstName!: string;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ default: false, type: "boolean" })
  isOnline!: boolean;

  @Column({ type: "varchar" })
  lastName!: string;

  @Column({ name: "last_seen", nullable: true, type: "timestamptz" })
  lastSeen!: Date;

  @OneToMany("Message", "sender")
  messages!: Relation<Message[]>;

  @Column({ name: "password_hash", type: "varchar" })
  passwordHash!: string;

  @OneToMany("UserSession", "user")
  sessions!: Relation<UserSession[]>;

  @OneToOne("UserSettings", "user")
  settings!: Relation<UserSettings>;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ type: "varchar", unique: true })
  username!: string;
}
