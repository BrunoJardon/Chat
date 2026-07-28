import pool from "./config/postgres.js";

export async function connectDatabase() {
  try {
    const client = await pool.connect();

    console.log("Connected to database");

    client.release();
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}
