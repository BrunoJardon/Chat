import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from "typeorm";

import { Theme } from "../enums.js";
import type { User } from "./User.js";

@Entity("user_settings")
export class UserSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne("User", "settings", { onDelete: "CASCADE" })
  user!: Relation<User>;

  @Column({ type: "enum", enum: Theme, default: Theme.SYSTEM })
  theme!: Theme;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
