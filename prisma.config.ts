// Prisma config for Supabase with pooler
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load from .env.local for Next.js
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Use DATABASE_URL with transaction pooler for migrations
    url: env("DATABASE_URL"),
  },
});
