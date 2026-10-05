import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usuarios } from "./usuarios";

// Registro de búsquedas (docs/03): sirve para ver qué se busca y no se encuentra.
export const busquedas = pgTable(
  "busquedas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    texto: text("texto"),
    filtros: jsonb("filtros")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    cantidadResultados: integer("cantidad_resultados").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("busquedas_sin_result_idx")
      .on(t.creadoEn)
      .where(sql`${t.cantidadResultados} = 0`),
  ],
);
