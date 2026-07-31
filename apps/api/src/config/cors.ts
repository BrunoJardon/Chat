import cors from "cors";

import { FRONTEND_URL } from "./env.js";

const allowedOrigins = [FRONTEND_URL];
const allowedHeaders = ["Content-Type", "Authorization"];

export const corsOptions: cors.CorsOptions = {
  allowedHeaders: allowedHeaders,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  origin: allowedOrigins,
};
