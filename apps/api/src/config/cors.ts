import cors from "cors";

import { WEB_URL } from "./env.js";

const allowedOrigins = [WEB_URL];
const allowedHeaders = ["Content-Type", "Authorization"];

export const corsOptions: cors.CorsOptions = {
  allowedHeaders: allowedHeaders,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  origin: allowedOrigins,
};
