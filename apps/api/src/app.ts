import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { MODE } from "./config/env.js";
import { corsOptions, loggerOptions, swaggerSpec } from "./config/index.js";
import healthRouter from "./routes/health.js";

const app: Express = express();

app.use(cors(corsOptions));
app.use(morgan("combined", { stream: loggerOptions }));

if (MODE !== "prod") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use(healthRouter);

export default app;
