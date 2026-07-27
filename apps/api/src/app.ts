import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";

import { corsOptions } from "./config/cors.js";

const app: Express = express();

app.use(cors(corsOptions));
app.use(morgan('dev'));


export default app;