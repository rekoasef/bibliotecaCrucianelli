import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

// Tipos, sistemas y temas comparten estructura (docs/03-modelo-de-datos.md).
// Inactivo = no se ofrece al cargar, pero los documentos existentes lo conservan.
function catalogo(nombreTabla: string) {
  return pgTable(nombreTabla, {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull().unique(),
    slug: text("slug").notNull().unique(),
    orden: integer("orden").notNull().default(0),
    activo: boolean("activo").notNull().default(true),
    ...timestamps,
  });
}

export const tipos = catalogo("tipos");
export const sistemas = catalogo("sistemas");
export const temas = catalogo("temas");

export type ItemCatalogo = typeof tipos.$inferSelect;

export const etiquetas = pgTable(
  "etiquetas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    // minúsculas, sin acentos, espacios simples (ver normalizeTag)
    nombreNormalizado: text("nombre_normalizado").notNull().unique(),
    ...timestamps,
  },
  (t) => [
    // Tolerancia a errores de tipeo en autocompletado y búsqueda.
    index("etiquetas_nombre_trgm").using(
      "gin",
      t.nombreNormalizado.op("gin_trgm_ops"),
    ),
  ],
);

export type Etiqueta = typeof etiquetas.$inferSelect;
