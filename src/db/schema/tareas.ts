import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Última ejecución de tareas periódicas (ej.: detección de cambios en Drive),
// para no repetirlas si el worker se reinicia el mismo día.
export const tareas = pgTable("tareas", {
  nombre: text("nombre").primaryKey(),
  ultimaEjecucion: timestamp("ultima_ejecucion", {
    withTimezone: true,
  }).notNull(),
  resultado: jsonb("resultado").$type<Record<string, number | string>>(),
});
