import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

// Jerarquía Segmento → Línea → Modelo (docs/04-taxonomia.md).
// `activo = false` oculta el nivel y todo lo que cuelga de él a usuarios no admin.

export const segmentos = pgTable("segmentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  slug: text("slug").notNull().unique(),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  ...timestamps,
});

export const lineas = pgTable(
  "lineas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    segmentoId: uuid("segmento_id")
      .notNull()
      .references(() => segmentos.id, { onDelete: "restrict" }),
    nombre: text("nombre").notNull(),
    slug: text("slug").notNull().unique(),
    descripcion: text("descripcion"),
    imagenDriveFileId: text("imagen_drive_file_id"),
    orden: integer("orden").notNull().default(0),
    activo: boolean("activo").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("lineas_segmento_nombre_unique").on(t.segmentoId, t.nombre),
    index("lineas_segmento_idx").on(t.segmentoId),
  ],
);

export const modelos = pgTable(
  "modelos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineaId: uuid("linea_id")
      .notNull()
      .references(() => lineas.id, { onDelete: "restrict" }),
    nombre: text("nombre").notNull(),
    slug: text("slug").notNull().unique(),
    descripcion: text("descripcion"),
    orden: integer("orden").notNull().default(0),
    activo: boolean("activo").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("modelos_linea_nombre_unique").on(t.lineaId, t.nombre),
    index("modelos_linea_idx").on(t.lineaId),
  ],
);

export type Segmento = typeof segmentos.$inferSelect;
export type Linea = typeof lineas.$inferSelect;
export type Modelo = typeof modelos.$inferSelect;
