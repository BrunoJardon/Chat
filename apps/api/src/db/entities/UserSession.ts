import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";

import type { User } from "./User.js";

@Entity("user_sessions")
export class UserSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne("User", "sessions", { onDelete: "CASCADE" })
  user!: Relation<User>;

  @Column({ name: "socket_id" })
  socketId!: string;

  @Column({ name: "device_id" })
  deviceId!: string;

  @Column({ name: "ip_address" })
  ipAddress!: string;

  @Column({ name: "user_agent" })
  userAgent!: string;

  @CreateDateColumn({ name: "logged_in_at" })
  loggedInAt!: Date;

  @Column({ name: "logged_out_at", type: "timestamptz", nullable: true })
  loggedOutAt!: Date;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;
}
