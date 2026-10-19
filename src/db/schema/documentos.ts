/**
 * Documentos, sus archivos, relaciones con la taxonomía y registro de accesos
 * (docs/03).
 *
 * @module
 */

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
import {
  etiquetas,
  productos,
  sistemas,
  tecnologias,
  temas,
  tipos,
} from "./taxonomia";
import { usuarios } from "./usuarios";

/** Ciclo de vida: borrador → vigente → obsoleto. */
export const estadoDoc = pgEnum("estado_doc", [
  "borrador",
  "vigente",
  "obsoleto",
]);

/**
 * Cómo se sirve un archivo: por `/api/archivos/[id]` (`servidor`) o con el link
 * público de Drive (`publico`, videos).
 */
export const modoAcceso = pgEnum("modo_acceso", ["servidor", "publico"]);

/** Estado de la extracción de texto del worker. */
export const estadoExtraccion = pgEnum("estado_extraccion", [
  "pendiente",
  "procesando",
  "ok",
  "sin_texto",
  "error",
  "no_aplica",
]);

/** Qué hizo el lector con el archivo. */
export const accionAcceso = pgEnum("accion_acceso", [
  "ver",
  "descargar",
  "video",
]);

/** Tipo `tsvector` de Postgres (Drizzle no lo trae). */
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/**
 * Documento de la biblioteca: unidad que se busca, clasifica y publica. Puede
 * tener varios archivos.
 *
 * @remarks Las restricciones garantizan que solo un obsoleto esté reemplazado y
 *   que un publicado tenga título y tipo.
 */
export const documentos = pgTable(
  "documentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo"),
    descripcion: text("descripcion"),
    tipoId: uuid("tipo_id").references(() => tipos.id, {
      onDelete: "restrict",
    }),
    // Públicos que lo ven además de fábrica (que ve todo). Ninguno = "Solo fábrica".
    visibleConcesionarios: boolean("visible_concesionarios")
      .notNull()
      .default(true),
    visibleClientes: boolean("visible_clientes").notNull().default(false),
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
    index("documentos_estado_idx").on(t.estado),
    index("documentos_tipo_idx").on(t.tipoId),
  ],
);

/**
 * Archivo de Drive incorporado a un documento, con su texto extraído para la
 * búsqueda.
 */
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

/**
 * Índice por página de los PDFs, para mostrar en qué páginas aparece lo buscado
 * (docs/02, "Páginas"). Sale de `archivos.texto_extraido`, que separa las
 * páginas con `\f`; lo reescribe el worker al extraer el texto.
 */
export const archivoPaginas = pgTable(
  "archivo_paginas",
  {
    archivoId: uuid("archivo_id")
      .notNull()
      .references(() => archivos.id, { onDelete: "cascade" }),
    pagina: integer("pagina").notNull(),
    busqueda: tsvector("busqueda").notNull(),
  },
  (t) => [primaryKey({ columns: [t.archivoId, t.pagina] })],
);

/**
 * Tabla de relación muchos a muchos entre documentos y un ítem de taxonomía
 * (borrado en cascada de ambos lados).
 *
 * @param nombreTabla - Nombre de la tabla.
 * @param columna - Columna del ítem (por ejemplo `linea_id`); en Drizzle se
 *   llama siempre `itemId`.
 * @param destino - Columna referenciada.
 */
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

/** Documentos asociados a una línea completa (todos sus modelos). */
export const documentoLineas = relacion(
  "documento_lineas",
  "linea_id",
  () => lineas.id,
);

/** Documentos asociados a modelos puntuales. */
export const documentoModelos = relacion(
  "documento_modelos",
  "modelo_id",
  () => modelos.id,
);

/** Sistemas de la máquina que trata el documento. */
export const documentoSistemas = relacion(
  "documento_sistemas",
  "sistema_id",
  () => sistemas.id,
);

/** Temas del documento. */
export const documentoTemas = relacion(
  "documento_temas",
  "tema_id",
  () => temas.id,
);

/** Familias de producto del documento. */
export const documentoProductos = relacion(
  "documento_productos",
  "producto_id",
  () => productos.id,
);

/** Tecnologías del documento. */
export const documentoTecnologias = relacion(
  "documento_tecnologias",
  "tecnologia_id",
  () => tecnologias.id,
);

/** Etiquetas libres del documento. */
export const documentoEtiquetas = relacion(
  "documento_etiquetas",
  "etiqueta_id",
  () => etiquetas.id,
);

/** Registro de aperturas, descargas y reproducciones (docs/03). */
export const accesos = pgTable(
  "accesos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    // null = cliente final sin cuenta (acceso libre).
    usuarioId: uuid("usuario_id").references(() => usuarios.id),
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

/** Fila de `documentos`. */
export type Documento = typeof documentos.$inferSelect;

/**
 * Fila de `archivos` (incluye `driveFileId`: no mandarla entera al cliente).
 */
export type Archivo = typeof archivos.$inferSelect;

/** Estado de un documento. */
export type EstadoDoc = (typeof estadoDoc.enumValues)[number];

/** Modo de acceso de un archivo. */
export type ModoAcceso = (typeof modoAcceso.enumValues)[number];
