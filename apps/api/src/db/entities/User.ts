import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from "typeorm";

import type { Conversation } from "./Conversation.js";
import type { Message } from "./Message.js";
import type { UserSession } from "./UserSession.js";
import type { UserSettings } from "./UserSettings.js";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ name: "password_hash" })
  passwordHash!: string;

  @Column({ nullable: true })
  avatar!: string;

  @Column({ default: false })
  isOnline!: boolean;

  @Column({ name: "last_seen", type: "timestamptz", nullable: true })
  lastSeen!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany("Message", "sender")
  messages!: Relation<Message[]>;

  @ManyToMany("Conversation", "participants")
  conversations!: Relation<Conversation[]>;

  @OneToMany("UserSession", "user")
  sessions!: Relation<UserSession[]>;

  @OneToOne("UserSettings", "user")
  settings!: Relation<UserSettings>;
}
