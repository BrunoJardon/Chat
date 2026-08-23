import "reflect-metadata";
import { DataSource } from "typeorm";

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, ENV } from "../config/env.js";
import { Conversation, Message, RefreshToken, User, UserSession, UserSettings } from "./entities/index.js";

export const AppDataSource = new DataSource({
  database: DB_NAME,
  entities: [Conversation, Message, RefreshToken, User, UserSession, UserSettings],
  host: DB_HOST,
  logging: ENV !== "prod",
  migrations: ["src/db/migrations/*{.ts,.js}"],
  password: DB_PASSWORD,
  port: Number(DB_PORT),
  synchronize: ENV !== "prod",
  type: "postgres",
  username: DB_USER,
});
