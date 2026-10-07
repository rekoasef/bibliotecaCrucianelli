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

// Palabras (sin acentos, en minúscula) que aparecen en los documentos, para
// corregir errores de tipeo ("dosificacin" → "dosificacion"). La llena
// rebuild_document_search (migración 0008). Solo crece: una palabra que ya no
// está en ningún documento visible nunca se propone (search.ts lo verifica).
export const vocabulario = pgTable(
  "vocabulario",
  { palabra: text("palabra").primaryKey() },
  (t) => [
    index("vocabulario_palabra_trgm").using(
      "gin",
      t.palabra.op("gin_trgm_ops"),
    ),
  ],
);
