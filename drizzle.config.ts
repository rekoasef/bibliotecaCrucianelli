/**
 * Configuración de drizzle-kit: esquema en `src/db/schema`, migraciones
 * versionadas en `src/db/migrations` (`npm run db:generate` / `db:migrate`).
 *
 * @module
 */

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
  strict: true,
});
