import { createStream } from "rotating-file-stream";

import { ENV } from "./env.js";

export const loggerOptions = createStream(`logs/${ENV}.log`, {
  compress: "gzip",
  interval: "1d",
  size: "10M",
});
