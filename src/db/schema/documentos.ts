import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { lineas, modelos } from "./maquinas";
import { etiquetas, sistemas, temas, tipos } from "./taxonomia";
import { usuarios } from "./usuarios";

export const visibilidadDoc = pgEnum("visibilidad_doc", [
  "concesionarios",
  "fabrica",
]);
export const estadoDoc = pgEnum("estado_doc", [
  "borrador",
  "vigente",
  "obsoleto",
]);
export const modoAcceso = pgEnum("modo_acceso", ["servidor", "publico"]);
export const estadoExtraccion = pgEnum("estado_extraccion", [
  "pendiente",
  "procesando",
  "ok",
  "sin_texto",
  "error",
  "no_aplica",
]);
export const accionAcceso = pgEnum("accion_acceso", [
  "ver",
  "descargar",
  "video",
]);

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const documentos = pgTable(
  "documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo"),
    descripcion: text("descripcion"),
    tipoId: uuid("tipo_id").references(() => tipos.id, {
      onDelete: "restrict",
    }),
    visibilidad: visibilidadDoc("visibilidad")
      .notNull()
      .default("concesionarios"),
    estado: estadoDoc("estado").notNull().default("borrador"),
    reemplazadoPorId: uuid("reemplazado_por_id").references(
      (): AnyPgColumn => documentos.id,
      {
        onDelete: "set null",
      },
    ),
    // Borrador creado con "Nueva versión": documento que pasa a obsoleto al publicarlo.
    reemplazaId: uuid("reemplaza_id").references(
      (): AnyPgColumn => documentos.id,
      {
        onDelete: "set null",
      },
    ),
    version: text("version"),
    fechaDocumento: date("fecha_documento"),
    publicadoEn: timestamp("publicado_en", { withTimezone: true }),
    requiereRevision: boolean("requiere_revision").notNull().default(false),
    creadoPor: uuid("creado_por").references(() => usuarios.id),
    actualizadoPor: uuid("actualizado_por").references(() => usuarios.id),
    // Lo calcula rebuildDocumentSearch (fase 4).
    busqueda: tsvector("busqueda"),
    ...timestamps,
  },
  (t) => [
    check(
      "documentos_reemplazado_solo_obsoleto",
      sql`${t.reemplazadoPorId} IS NULL OR ${t.estado} = 'obsoleto'`,
    ),
    check(
      "documentos_no_se_reemplaza_a_si_mismo",
      sql`${t.reemplazadoPorId} <> ${t.id}`,
    ),
    check(
      "documentos_publicado_completo",
      sql`${t.estado} = 'borrador' OR (${t.titulo} IS NOT NULL AND ${t.tipoId} IS NOT NULL)`,
    ),
    index("documentos_busqueda_idx").using("gin", t.busqueda),
    index("documentos_titulo_trgm").using(
      "gin",
      sql`f_unaccent_lower(${t.titulo}) gin_trgm_ops`,
    ),
    index("documentos_estado_vis").on(t.estado, t.visibilidad),
    index("documentos_tipo_idx").on(t.tipoId),
  ],
);

export const archivos = pgTable(
  "archivos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentoId: uuid("documento_id")
      .notNull()
      .references(() => documentos.id, { onDelete: "cascade" }),
    // Nunca se envía al cliente si modo_acceso = 'servidor' (CLAUDE.md, regla 3).
    driveFileId: text("drive_file_id").notNull().unique(),
    nombre: text("nombre").notNull(),
    mimeType: text("mime_type").notNull(),
    tamanoBytes: bigint("tamano_bytes", { mode: "number" }),
    driveModificadoEn: timestamp("drive_modificado_en", { withTimezone: true }),
    modoAcceso: modoAcceso("modo_acceso").notNull().default("servidor"),
    orden: integer("orden").notNull().default(0),
    disponible: boolean("disponible").notNull().default(true),
    textoExtraido: text("texto_extraido"),
    estadoExtraccion: estadoExtraccion("estado_extraccion")
      .notNull()
      .default("pendiente"),
    extraccionError: text("extraccion_error"),
    ...timestamps,
  },
  (t) => [
    index("archivos_documento_idx").on(t.documentoId),
    index("archivos_extraccion_idx")
      .on(t.estadoExtraccion)
      .where(sql`${t.estadoExtraccion} = 'pendiente'`),
  ],
);

function relacion<T extends AnyPgColumn>(
  nombreTabla: string,
  columna: string,
  destino: () => T,
) {
  return pgTable(
    nombreTabla,
    {
      documentoId: uuid("documento_id")
        .notNull()
        .references(() => documentos.id, { onDelete: "cascade" }),
      itemId: uuid(columna)
        .notNull()
        .references(destino, { onDelete: "cascade" }),
    },
    (t) => [
      primaryKey({ columns: [t.documentoId, t.itemId] }),
      index(`${nombreTabla}_${columna}_idx`).on(t.itemId),
    ],
  );
}

export const documentoLineas = relacion(
  "documento_lineas",
  "linea_id",
  () => lineas.id,
);
export const documentoModelos = relacion(
  "documento_modelos",
  "modelo_id",
  () => modelos.id,
);
export const documentoSistemas = relacion(
  "documento_sistemas",
  "sistema_id",
  () => sistemas.id,
);
export const documentoTemas = relacion(
  "documento_temas",
  "tema_id",
  () => temas.id,
);
export const documentoEtiquetas = relacion(
  "documento_etiquetas",
  "etiqueta_id",
  () => etiquetas.id,
);

export const accesos = pgTable(
  "accesos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    documentoId: uuid("documento_id")
      .notNull()
      .references(() => documentos.id, { onDelete: "cascade" }),
    archivoId: uuid("archivo_id").references(() => archivos.id, {
      onDelete: "set null",
    }),
    accion: accionAcceso("accion").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("accesos_documento_idx").on(t.documentoId, t.creadoEn),
    index("accesos_usuario_idx").on(t.usuarioId, t.creadoEn),
  ],
);

export type Documento = typeof documentos.$inferSelect;
export type Archivo = typeof archivos.$inferSelect;
export type EstadoDoc = (typeof estadoDoc.enumValues)[number];
export type VisibilidadDoc = (typeof visibilidadDoc.enumValues)[number];
export type ModoAcceso = (typeof modoAcceso.enumValues)[number];
