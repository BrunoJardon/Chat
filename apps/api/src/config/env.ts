export const PORT = process.env.PORT ?? "3000";
export const HOST = process.env.HOST ?? "localhost";
export const MODE = process.env.MODE ?? "dev";

export const API_URL = `http://${HOST}:${PORT}`;
export const FRONTEND_URL = process.env.FRONTEND_URL ?? `http://${HOST}:${PORT}`;

export const DB_HOST = process.env.DB_HOST ?? "localhost"
export const DB_PORT = process.env.DB_PORT ?? "5432"
export const DB_NAME = process.env.DB_NAME ?? "chat"
export const DB_USER = process.env.DB_USER ?? "postgres"
export const DB_PASSWORD = process.env.DB_PASSWORD ?? "password"