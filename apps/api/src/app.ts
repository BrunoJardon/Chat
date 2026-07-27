import cors from "cors";
import express, { type Express } from "express";

import { corsOptions } from "./config/cors.js";

const app: Express = express();

app.use(cors(corsOptions));

export default app;