import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Contadores de ventana fija para rate limiting (login, recuperación de contraseña).
export const limitesTasa = pgTable("limites_tasa", {
  clave: text("clave").primaryKey(),
  cantidad: integer("cantidad").notNull(),
  ventanaInicio: timestamp("ventana_inicio", { withTimezone: true }).notNull(),
});
