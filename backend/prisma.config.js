import { config } from "dotenv";
import { defineConfig } from "prisma/config";
const nodeEnv = process.env.NODE_ENV || "development";
config({ path: `.env.${nodeEnv}` });
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
//# sourceMappingURL=prisma.config.js.map