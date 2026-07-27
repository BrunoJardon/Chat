export const PORT = process.env.PORT ?? "3000";
export const HOST = process.env.HOST ?? "localhost";
export const MODE = process.env.MODE ?? "dev";

export const API_URL = `http://${HOST}:${PORT}`;
export const FRONTEND_URL = process.env.FRONTEND_URL ?? `http://${HOST}:${PORT}`;
