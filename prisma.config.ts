import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use direct connection for Prisma CLI commands (migrate, db push, etc).
    url: env("DIRECT_URL"),
  },
});
