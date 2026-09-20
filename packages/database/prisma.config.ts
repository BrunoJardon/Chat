import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI runs from this package dir (pnpm --filter @chat/database …),
// so the monorepo root .env is one level up from the workspace root.
loadEnv({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: env("DATABASE_URL") },
});
