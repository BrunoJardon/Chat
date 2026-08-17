import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from "typeorm";

import type { User } from "./User.js";

@Entity("user_sessions")
export class UserSession {
  @Column({ name: "device_id", type: "varchar" })
  deviceId!: string;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "ip_address", type: "varchar" })
  ipAddress!: string;

  @Column({ default: true, name: "is_active", type: "boolean" })
  isActive!: boolean;

  @CreateDateColumn({ name: "logged_in_at" })
  loggedInAt!: Date;

  @Column({ name: "logged_out_at", nullable: true, type: "timestamptz" })
  loggedOutAt!: Date;

  @Column({ name: "socket_id", type: "varchar" })
  socketId!: string;

  @ManyToOne("User", "sessions", { onDelete: "CASCADE" })
  user!: Relation<User>;

  @Column({ name: "user_agent", type: "varchar" })
  userAgent!: string;
}
