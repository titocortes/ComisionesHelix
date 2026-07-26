import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const nodeEnv = process.env.NODE_ENV || "development";
config({ path: `.env.${nodeEnv}` });

// Prisma CLI (migrations) requires mysql:// — the mariadb adapter uses mariadb:// at runtime
const migrateUrl = process.env["DATABASE_URL"]?.replace("mariadb://", "mysql://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl,
  },
});
