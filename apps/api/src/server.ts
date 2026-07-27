import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { API_URL, PORT } from "./config/index.js";

app.listen(PORT, () => {
  console.log(`Chat backend listening on ${API_URL}`);
});
