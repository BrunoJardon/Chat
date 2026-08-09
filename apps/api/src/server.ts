import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { API_PORT, API_URL, WEB_URL } from "./config/env.js";
import { connectDatabase } from "./db.js";
import configureSocket from "./socket/index.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    credentials: true,
    origin: WEB_URL,
  },
});

await connectDatabase();

configureSocket(io);

server.listen(API_PORT, () => {
  console.log(`Chat backend listening on ${API_URL}`);
  console.log(`API Swagger docs on ${API_URL}/api/docs`);
});
