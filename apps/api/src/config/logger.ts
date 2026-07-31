import { createStream } from "rotating-file-stream";

import { MODE } from "./env.js";

export const loggerOptions = createStream(`logs/${MODE}.log`, {
  compress: "gzip",
  interval: "1d",
  size: "10M",
});
