import { AppDataSource } from "./data-source.js";

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log("Database connected via TypeORM");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}
