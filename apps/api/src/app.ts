import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { ENV } from "./config/env.js";
import { corsOptions, loggerOptions, swaggerSpec } from "./config/index.js";
import apiRouter from "./routes/index.js";

const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("combined", { stream: loggerOptions }));

if (ENV !== "prod") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/api", apiRouter);

export default app;
