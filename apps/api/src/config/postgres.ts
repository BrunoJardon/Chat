import { Pool } from "pg";

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from "./env.js";

const pool = new Pool({
  database: DB_NAME,
  host: DB_HOST,
  password: DB_PASSWORD,
  port: Number(DB_PORT),
  user: DB_USER,
});

export default pool;
