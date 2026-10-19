/**
 * Catálogos de clasificación y etiquetas libres (docs/04-taxonomia.md).
 *
 * @module
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

/**
 * Tipos, sistemas, temas, productos y tecnologías comparten estructura
 * (docs/03-modelo-de-datos.md). Inactivo = no se ofrece al cargar, pero los
 * documentos existentes lo conservan.
 *
 * @param nombreTabla - Nombre de la tabla.
 */
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

/** Tipo de documento (manual, despiece, boletín técnico…). */
export const tipos = catalogo("tipos");

/** Sistema de la máquina (dosificación, hidráulica…). */
export const sistemas = catalogo("sistemas");

/** Tema transversal (regulación, calibración…). */
export const temas = catalogo("temas");

/**
 * Familia de producto: Sembradoras, Fertilizadoras, Tecnología, Accesorios
 * siembra.
 */
export const productos = catalogo("productos");

/** Tecnologías de los documentos de Tecnología: Precision Planting, Leaf… */
export const tecnologias = catalogo("tecnologias");

/** Fila de cualquier catálogo. */
export type ItemCatalogo = typeof tipos.$inferSelect;

/**
 * Etiquetas libres. `nombre_normalizado` (minúsculas, sin acentos, espacios
 * simples; ver `normalizeTag`) es único.
 */
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

/** Fila de `etiquetas`. */
export type Etiqueta = typeof etiquetas.$inferSelect;
