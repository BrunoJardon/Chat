import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation } from "typeorm";

import type { User } from "./User.js";

@Entity("refresh_tokens")
export class RefreshToken {
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt!: Date | null;

  @Column({ name: "token_hash", type: "varchar" })
  @Index({ unique: true })
  tokenHash!: string;

  @ManyToOne("User", "refreshTokens", { onDelete: "CASCADE" })
  user!: Relation<User>;
}
