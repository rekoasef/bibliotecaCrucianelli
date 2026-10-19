/**
 * Rate limiting.
 *
 * @module
 */

import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Contadores de ventana fija para rate limiting (login, recuperación de
 * contraseña, invitaciones y accesos sin cuenta). Ver `src/lib/rate-limit.ts`.
 */
export const limitesTasa = pgTable("limites_tasa", {
  clave: text("clave").primaryKey(),
  cantidad: integer("cantidad").notNull(),
  ventanaInicio: timestamp("ventana_inicio", { withTimezone: true }).notNull(),
});
