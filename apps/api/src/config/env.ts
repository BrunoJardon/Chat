export const ENV = process.env.ENV ?? "dev";

export const API_HOST = process.env.API_HOST ?? "localhost";
export const API_PORT = process.env.API_PORT ?? "3000";
export const API_URL = `http://${API_HOST}:${API_PORT}`;

export const WEB_HOST = process.env.WEB_HOST ?? API_HOST;
export const WEB_PORT = process.env.WEB_PORT ?? "5173";
export const WEB_URL = `http://${WEB_HOST}:${WEB_PORT}`;

export const DB_HOST = process.env.DB_HOST ?? "localhost";
export const DB_PORT = process.env.DB_PORT ?? "5432";
export const DB_NAME = process.env.DB_NAME ?? "chat";
export const DB_USER = process.env.DB_USER ?? "chat";
export const DB_PASSWORD = process.env.DB_PASSWORD ?? "changeme";

// Development fallbacks only. These must become required (fail-fast) before merging develop into main.
export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "insecure-dev-secret-do-not-use-in-prod";
export const JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
