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
  @Column({ type: "varchar", name: "device_id" })
  deviceId!: string;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", name: "ip_address" })
  ipAddress!: string;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ name: "logged_in_at" })
  loggedInAt!: Date;

  @Column({ name: "logged_out_at", nullable: true, type: "timestamptz" })
  loggedOutAt!: Date;

  @Column({ type: "varchar", name: "socket_id" })
  socketId!: string;

  @ManyToOne("User", "sessions", { onDelete: "CASCADE" })
  user!: Relation<User>;

  @Column({ type: "varchar", name: "user_agent" })
  userAgent!: string;
}
