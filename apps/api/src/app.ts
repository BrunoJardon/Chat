import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";

import { corsOptions } from "./config/cors.js";
import { loggerOptions } from "./config/index.js";

const app: Express = express();

app.use(cors(corsOptions));
app.use(morgan("combined", { stream: loggerOptions }));

export default app;
