/**
 * Conexión a Postgres (postgres.js) y cliente de Drizzle compartido por la app,
 * el worker y los scripts.
 *
 * @module
 */

import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Lugar en `globalThis` donde se guarda la conexión en desarrollo. */
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

/**
 * Conexión a la base. En desarrollo se reutiliza entre recargas de `next dev`
 * (guardada en `globalThis`).
 */
const client = globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

/** Cliente de Drizzle con el esquema completo y columnas en `snake_case`. */
export const db = drizzle(client, { schema, casing: "snake_case" });
