import "reflect-metadata";

import { DataSource } from "typeorm";

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, ENV } from "../config/env.js";
import { Conversation, Message, User, UserSession, UserSettings } from "./entities/index.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: DB_HOST,
  port: Number(DB_PORT),
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  synchronize: ENV !== "prod",
  logging: ENV !== "prod",
  entities: [Conversation, Message, User, UserSession, UserSettings],
  migrations: ["src/db/migrations/*{.ts,.js}"],
});
