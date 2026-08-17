import { Column, Entity, OneToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from "typeorm";

import type { User } from "./User.js";

import { Theme } from "../enums.js";

@Entity("user_settings")
export class UserSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ default: Theme.SYSTEM, enum: Theme, type: "enum" })
  theme!: Theme;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToOne("User", "settings", { onDelete: "CASCADE" })
  user!: Relation<User>;
}
