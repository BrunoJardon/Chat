import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
dotenv.config();

import app from "./app.js";
import { API_URL, FRONTEND_URL, PORT } from "./config/env.js";
import { connectDatabase } from "./db.js";
import configureSocket from "./socket/index.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    credentials: true,
    origin: FRONTEND_URL,
  },
});

await connectDatabase();

configureSocket(io);

app.listen(PORT, () => {
  console.log(`Chat backend listening on ${API_URL}`);
  console.log(`API Swagger docs on ${API_URL}/api/docs`);
});
