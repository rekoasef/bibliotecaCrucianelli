import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  archivos,
  documentoEtiquetas,
  documentoLineas,
  documentoModelos,
  documentoProductos,
  documentoSistemas,
  documentoTemas,
  documentos,
  etiquetas,
  lineas,
  modelos,
  tipos,
  type EstadoDoc,
  type ModoAcceso,
} from "@/db/schema";
import { findClasificacionExistente } from "@/db/queries/taxonomia";
import { getDrive, pathFromRoot, type DriveItem } from "@/lib/drive";
import {
  defaultModoAcceso,
  initialEstadoExtraccion,
  titleFromFileName,
} from "@/lib/drive/mime";
import { rebuildDocumentSearch } from "@/lib/search/reindex";
import { normalizeTag } from "@/lib/text";
import {
  faltantesParaPublicar,
  modelosSinLineaCubierta,
  parseEtiquetas,
} from "./rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DocumentoError extends Error {}

// ── Incorporar desde Drive ──────────────────────────────────────────────────

/** IDs de Drive (de una lista) que ya están incorporados a la biblioteca. */
export async function driveIdsIncorporados(driveIds: string[]) {
  if (driveIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ driveFileId: archivos.driveFileId })
    .from(archivos)
    .where(inArray(archivos.driveFileId, driveIds));
  return new Set(rows.map((r) => r.driveFileId));
}

/**
 * Valida que cada archivo exista, no sea carpeta, esté dentro de una raíz permitida
 * y no esté ya incorporado (docs/02: nada entra automáticamente, el admin elige).
 */
async function validarArchivosDrive(driveIds: string[]): Promise<DriveItem[]> {
  const unicos = [...new Set(driveIds)];
  if (unicos.length === 0)
    throw new DocumentoError("No seleccionaste archivos.");
  const drive = getDrive();
  const items: DriveItem[] = [];
  for (const id of unicos) {
    // Con explorador: tiene que estar dentro de una raíz. Con links públicos:
    // alcanza con que el archivo se pueda abrir (docs/02).
    const item = drive.browsable
      ? (await pathFromRoot(id))?.at(-1)
      : await drive.getItem(id);
    if (!item || item.isFolder) {
      throw new DocumentoError(
        drive.browsable
          ? "Uno de los archivos no existe, no es un archivo o está fuera de las carpetas permitidas."
          : "No se pudo abrir uno de los archivos. Revisá que el link sea de un archivo (no de una carpeta) y que esté compartido con “Cualquier persona con el vínculo”.",
      );
    }
    items.push(item);
  }
  const yaIncorporados = await driveIdsIncorporados(unicos);
  if (yaIncorporados.size > 0) {
    throw new DocumentoError(
      "Algunos archivos ya están en la biblioteca. Actualizá la página.",
    );
  }
  return items;
}

function archivoDesdeDrive(
  item: DriveItem,
  documentoId: string,
  orden: number,
) {
  return {
    documentoId,
    driveFileId: item.id,
    nombre: item.name,
    mimeType: item.mimeType,
    tamanoBytes: item.size,
    driveModificadoEn: item.modifiedTime,
    modoAcceso: defaultModoAcceso(item.mimeType),
    estadoExtraccion: initialEstadoExtraccion(item.mimeType),
    orden,
  };
}

/** Crea borradores: uno por archivo, o uno solo con todos. Devuelve los IDs creados. */
export async function incorporarDesdeDrive(
  driveIds: string[],
  modo: "uno-por-archivo" | "uno-con-todos",
  usuarioId: string,
) {
  const items = await validarArchivosDrive(driveIds);

  return db.transaction(async (tx) => {
    const grupos = modo === "uno-con-todos" ? [items] : items.map((i) => [i]);
    const creados: string[] = [];
    for (const grupo of grupos) {
      const [doc] = await tx
        .insert(documentos)
        .values({
          titulo: titleFromFileName(grupo[0].name),
          creadoPor: usuarioId,
          actualizadoPor: usuarioId,
        })
        .returning({ id: documentos.id });
      await tx
        .insert(archivos)
        .values(grupo.map((item, i) => archivoDesdeDrive(item, doc.id, i)));
      await rebuildDocumentSearch(doc.id, tx);
      creados.push(doc.id);
    }
    return creados;
  });
}

/** Agrega archivos de Drive a un documento existente (por ejemplo, para una nueva versión). */
export async function agregarArchivos(
  documentoId: string,
  driveIds: string[],
  usuarioId: string,
) {
  const items = await validarArchivosDrive(driveIds);
  await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${archivos.orden}), -1)::int` })
      .from(archivos)
      .where(eq(archivos.documentoId, documentoId));
    await tx
      .insert(archivos)
      .values(
        items.map((item, i) =>
          archivoDesdeDrive(item, documentoId, max + 1 + i),
        ),
      );
    await tx
      .update(documentos)
      .set({ actualizadoPor: usuarioId })
      .where(eq(documentos.id, documentoId));
  });
}

// ── Lectura para el admin ───────────────────────────────────────────────────

export type DocumentoFilters = {
  q?: string;
  estado?: EstadoDoc;
  tipoId?: string;
  /** Para quién está marcado (fábrica ve todo). */
  publico?: "concesionarios" | "clientes" | "solo-fabrica";
  lineaId?: string;
  revision?: boolean;
  /** Archivos no disponibles en Drive o con error de extracción. */
  problemas?: boolean;
};

export async function listDocumentosAdmin(f: DocumentoFilters = {}) {
  const where: SQL[] = [];
  if (f.q) where.push(ilike(documentos.titulo, `%${f.q}%`));
  if (f.estado) where.push(eq(documentos.estado, f.estado));
  if (f.tipoId) where.push(eq(documentos.tipoId, f.tipoId));
  if (f.publico === "concesionarios")
    where.push(eq(documentos.visibleConcesionarios, true));
  if (f.publico === "clientes")
    where.push(eq(documentos.visibleClientes, true));
  if (f.publico === "solo-fabrica") {
    where.push(
      and(
        eq(documentos.visibleConcesionarios, false),
        eq(documentos.visibleClientes, false),
      )!,
    );
  }
  if (f.revision) where.push(eq(documentos.requiereRevision, true));
  if (f.problemas) {
    where.push(sql`EXISTS (SELECT 1 FROM archivos a WHERE a.documento_id = ${documentos.id}
                           AND (NOT a.disponible OR a.estado_extraccion = 'error'))`);
  }
  if (f.lineaId) {
    where.push(sql`(
      EXISTS (SELECT 1 FROM documento_lineas dl WHERE dl.documento_id = ${documentos.id} AND dl.linea_id = ${f.lineaId})
      OR EXISTS (SELECT 1 FROM documento_modelos dm JOIN modelos m ON m.id = dm.modelo_id
                 WHERE dm.documento_id = ${documentos.id} AND m.linea_id = ${f.lineaId})
    )`);
  }

  return db
    .select({
      id: documentos.id,
      titulo: documentos.titulo,
      estado: documentos.estado,
      visibleConcesionarios: documentos.visibleConcesionarios,
      visibleClientes: documentos.visibleClientes,
      requiereRevision: documentos.requiereRevision,
      actualizadoEn: documentos.actualizadoEn,
      tipoNombre: tipos.nombre,
      cantidadArchivos: sql<number>`(SELECT count(*)::int FROM archivos a WHERE a.documento_id = ${documentos.id})`,
    })
    .from(documentos)
    .leftJoin(tipos, eq(documentos.tipoId, tipos.id))
    .where(and(...where))
    .orderBy(desc(documentos.actualizadoEn))
    .limit(500);
}

export async function getDocumentoAdmin(id: string) {
  const [doc] = await db.select().from(documentos).where(eq(documentos.id, id));
  if (!doc) return null;

  const [arch, lin, mod, sis, tem, prod, etq] = await Promise.all([
    db
      .select()
      .from(archivos)
      .where(eq(archivos.documentoId, id))
      .orderBy(asc(archivos.orden)),
    db
      .select({ id: documentoLineas.itemId })
      .from(documentoLineas)
      .where(eq(documentoLineas.documentoId, id)),
    db
      .select({ id: documentoModelos.itemId })
      .from(documentoModelos)
      .where(eq(documentoModelos.documentoId, id)),
    db
      .select({ id: documentoSistemas.itemId })
      .from(documentoSistemas)
      .where(eq(documentoSistemas.documentoId, id)),
    db
      .select({ id: documentoTemas.itemId })
      .from(documentoTemas)
      .where(eq(documentoTemas.documentoId, id)),
    db
      .select({ id: documentoProductos.itemId })
      .from(documentoProductos)
      .where(eq(documentoProductos.documentoId, id)),
    db
      .select({ nombre: etiquetas.nombre })
      .from(documentoEtiquetas)
      .innerJoin(etiquetas, eq(documentoEtiquetas.itemId, etiquetas.id))
      .where(eq(documentoEtiquetas.documentoId, id))
      .orderBy(asc(etiquetas.nombreNormalizado)),
  ]);

  return {
    ...doc,
    archivos: arch,
    lineaIds: lin.map((r) => r.id),
    modeloIds: mod.map((r) => r.id),
    sistemaIds: sis.map((r) => r.id),
    temaIds: tem.map((r) => r.id),
    productoIds: prod.map((r) => r.id),
    etiquetas: etq.map((r) => r.nombre),
  };
}

export type DocumentoAdmin = NonNullable<
  Awaited<ReturnType<typeof getDocumentoAdmin>>
>;

/** Siguiente borrador para "Guardar y siguiente" (el más viejo, sin contar el actual). */
export async function siguienteBorrador(actualId: string) {
  const [row] = await db
    .select({ id: documentos.id })
    .from(documentos)
    .where(and(eq(documentos.estado, "borrador"), ne(documentos.id, actualId)))
    .orderBy(asc(documentos.creadoEn))
    .limit(1);
  return row?.id ?? null;
}

// ── Guardar clasificación ───────────────────────────────────────────────────

export type ClasificacionInput = {
  titulo: string | null;
  descripcion: string | null;
  tipoId: string | null;
  version: string | null;
  fechaDocumento: string | null;
  visibleConcesionarios: boolean;
  visibleClientes: boolean;
  lineaIds: string[];
  modeloIds: string[];
  sistemaIds: string[];
  temaIds: string[];
  productoIds: string[];
  etiquetas: string;
};

async function replaceRelation(
  tx: Tx,
  table:
    | typeof documentoLineas
    | typeof documentoModelos
    | typeof documentoSistemas
    | typeof documentoTemas
    | typeof documentoProductos
    | typeof documentoEtiquetas,
  documentoId: string,
  ids: string[],
) {
  await tx.delete(table).where(eq(table.documentoId, documentoId));
  if (ids.length > 0) {
    await tx
      .insert(table)
      .values([...new Set(ids)].map((itemId) => ({ documentoId, itemId })));
  }
}

/** Busca o crea las etiquetas. Error si alguna ya es tipo, sistema, tema o máquina. */
async function resolverEtiquetas(tx: Tx, input: string) {
  const nombres = parseEtiquetas(input, normalizeTag);
  const ids: string[] = [];
  for (const nombre of nombres) {
    const nombreNormalizado = normalizeTag(nombre);
    const [existente] = await tx
      .select({ id: etiquetas.id })
      .from(etiquetas)
      .where(eq(etiquetas.nombreNormalizado, nombreNormalizado));
    if (existente) {
      ids.push(existente.id);
      continue;
    }
    const otra = await findClasificacionExistente(nombreNormalizado);
    if (otra) {
      throw new DocumentoError(
        `"${nombre}" ya existe como ${otra.donde}: elegilo en esa sección en vez de usarlo como etiqueta.`,
      );
    }
    const [nueva] = await tx
      .insert(etiquetas)
      .values({ nombre, nombreNormalizado })
      .onConflictDoNothing()
      .returning({ id: etiquetas.id });
    ids.push(
      nueva?.id ??
        (
          await tx
            .select({ id: etiquetas.id })
            .from(etiquetas)
            .where(eq(etiquetas.nombreNormalizado, nombreNormalizado))
        )[0].id,
    );
  }
  return ids;
}

export async function guardarClasificacion(
  documentoId: string,
  input: ClasificacionInput,
  usuarioId: string,
) {
  await db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ estado: documentos.estado })
      .from(documentos)
      .where(eq(documentos.id, documentoId));
    if (!actual) throw new DocumentoError("El documento no existe.");

    // Un documento publicado tiene que seguir cumpliendo los requisitos.
    if (actual.estado !== "borrador") {
      const faltan = faltantesParaPublicar({
        titulo: input.titulo,
        tipoId: input.tipoId,
        cantidadArchivos: 1,
        cantidadMaquinas: input.lineaIds.length + input.modeloIds.length,
        cantidadProductos: input.productoIds.length,
      });
      if (faltan.length > 0) throw new DocumentoError(faltan.join(" "));
    }

    const modelosElegidos = input.modeloIds.length
      ? await tx
          .select({ id: modelos.id, lineaId: modelos.lineaId })
          .from(modelos)
          .where(inArray(modelos.id, input.modeloIds))
      : [];

    await tx
      .update(documentos)
      .set({
        titulo: input.titulo,
        descripcion: input.descripcion,
        tipoId: input.tipoId,
        version: input.version,
        fechaDocumento: input.fechaDocumento,
        visibleConcesionarios: input.visibleConcesionarios,
        visibleClientes: input.visibleClientes,
        actualizadoPor: usuarioId,
      })
      .where(eq(documentos.id, documentoId));

    await replaceRelation(tx, documentoLineas, documentoId, input.lineaIds);
    await replaceRelation(
      tx,
      documentoModelos,
      documentoId,
      modelosSinLineaCubierta(input.lineaIds, modelosElegidos),
    );
    await replaceRelation(tx, documentoSistemas, documentoId, input.sistemaIds);
    await replaceRelation(tx, documentoTemas, documentoId, input.temaIds);
    await replaceRelation(
      tx,
      documentoProductos,
      documentoId,
      input.productoIds,
    );
    await replaceRelation(
      tx,
      documentoEtiquetas,
      documentoId,
      await resolverEtiquetas(tx, input.etiquetas),
    );
    await rebuildDocumentSearch(documentoId, tx);
  });
}

// ── Publicación y versiones ─────────────────────────────────────────────────

async function contarParaPublicar(tx: Tx, documentoId: string) {
  const [row] = await tx.execute<{
    archivos: number;
    maquinas: number;
    productos: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM archivos WHERE documento_id = ${documentoId}) AS archivos,
      (SELECT count(*)::int FROM documento_lineas WHERE documento_id = ${documentoId})
      + (SELECT count(*)::int FROM documento_modelos WHERE documento_id = ${documentoId}) AS maquinas,
      (SELECT count(*)::int FROM documento_productos WHERE documento_id = ${documentoId}) AS productos
  `);
  return row;
}

/**
 * Publica un borrador. Si es una nueva versión, en la misma transacción el
 * documento anterior pasa a obsoleto y apunta al nuevo (docs/03, "Versiones").
 */
export async function publicar(documentoId: string, usuarioId: string) {
  await db.transaction(async (tx) => {
    const [doc] = await tx
      .select()
      .from(documentos)
      .where(eq(documentos.id, documentoId))
      .for("update");
    if (!doc) throw new DocumentoError("El documento no existe.");
    if (doc.estado !== "borrador")
      throw new DocumentoError("El documento ya está publicado.");

    const counts = await contarParaPublicar(tx, documentoId);
    const faltan = faltantesParaPublicar({
      titulo: doc.titulo,
      tipoId: doc.tipoId,
      cantidadArchivos: counts.archivos,
      cantidadMaquinas: counts.maquinas,
      cantidadProductos: counts.productos,
    });
    if (faltan.length > 0) throw new DocumentoError(faltan.join(" "));

    await tx
      .update(documentos)
      .set({
        estado: "vigente",
        publicadoEn: doc.publicadoEn ?? new Date(),
        actualizadoPor: usuarioId,
      })
      .where(eq(documentos.id, documentoId));

    if (doc.reemplazaId) {
      await tx
        .update(documentos)
        .set({
          estado: "obsoleto",
          reemplazadoPorId: documentoId,
          actualizadoPor: usuarioId,
        })
        .where(
          and(
            eq(documentos.id, doc.reemplazaId),
            ne(documentos.estado, "borrador"),
          ),
        );
    }
  });
}

export async function marcarObsoleto(documentoId: string, usuarioId: string) {
  const [row] = await db
    .update(documentos)
    .set({ estado: "obsoleto", actualizadoPor: usuarioId })
    .where(
      and(eq(documentos.id, documentoId), eq(documentos.estado, "vigente")),
    )
    .returning({ id: documentos.id });
  if (!row)
    throw new DocumentoError(
      "Solo un documento vigente puede marcarse como obsoleto.",
    );
}

/** Vuelve a vigente un obsoleto que no fue reemplazado por otro. */
export async function restaurarVigente(documentoId: string, usuarioId: string) {
  const [row] = await db
    .update(documentos)
    .set({ estado: "vigente", actualizadoPor: usuarioId })
    .where(
      and(
        eq(documentos.id, documentoId),
        eq(documentos.estado, "obsoleto"),
        sql`${documentos.reemplazadoPorId} IS NULL`,
      ),
    )
    .returning({ id: documentos.id });
  if (!row)
    throw new DocumentoError(
      "Este documento fue reemplazado por una versión nueva.",
    );
}

/**
 * "Nueva versión": borrador que copia la clasificación (no los archivos) y recuerda
 * a qué documento reemplaza. Devuelve el ID del borrador.
 */
export async function nuevaVersion(documentoId: string, usuarioId: string) {
  return db.transaction(async (tx) => {
    const [orig] = await tx
      .select()
      .from(documentos)
      .where(eq(documentos.id, documentoId));
    if (!orig || orig.estado !== "vigente") {
      throw new DocumentoError(
        "Solo se puede crear una nueva versión de un documento vigente.",
      );
    }
    const [pendiente] = await tx
      .select({ id: documentos.id })
      .from(documentos)
      .where(
        and(
          eq(documentos.reemplazaId, documentoId),
          eq(documentos.estado, "borrador"),
        ),
      );
    if (pendiente) return pendiente.id; // ya hay una nueva versión en preparación

    const [nuevo] = await tx
      .insert(documentos)
      .values({
        titulo: orig.titulo,
        descripcion: orig.descripcion,
        tipoId: orig.tipoId,
        visibleConcesionarios: orig.visibleConcesionarios,
        visibleClientes: orig.visibleClientes,
        reemplazaId: orig.id,
        creadoPor: usuarioId,
        actualizadoPor: usuarioId,
      })
      .returning({ id: documentos.id });

    for (const table of [
      documentoLineas,
      documentoModelos,
      documentoSistemas,
      documentoTemas,
      documentoProductos,
      documentoEtiquetas,
    ]) {
      const rows = await tx
        .select({ itemId: table.itemId })
        .from(table)
        .where(eq(table.documentoId, orig.id));
      if (rows.length) {
        await tx
          .insert(table)
          .values(
            rows.map((r) => ({ documentoId: nuevo.id, itemId: r.itemId })),
          );
      }
    }
    await rebuildDocumentSearch(nuevo.id, tx);
    return nuevo.id;
  });
}

export async function eliminarBorrador(documentoId: string) {
  const [row] = await db
    .delete(documentos)
    .where(
      and(eq(documentos.id, documentoId), eq(documentos.estado, "borrador")),
    )
    .returning({ id: documentos.id });
  if (!row) throw new DocumentoError("Solo se pueden eliminar borradores.");
}

// ── Archivos de un documento ────────────────────────────────────────────────

export async function setModoAcceso(archivoId: string, modo: ModoAcceso) {
  await db
    .update(archivos)
    .set({ modoAcceso: modo })
    .where(eq(archivos.id, archivoId));
}

export async function quitarArchivo(archivoId: string) {
  await db.transaction(async (tx) => {
    const [arch] = await tx
      .select()
      .from(archivos)
      .where(eq(archivos.id, archivoId));
    if (!arch) return;
    const [doc] = await tx
      .select({ estado: documentos.estado })
      .from(documentos)
      .where(eq(documentos.id, arch.documentoId));
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(archivos)
      .where(eq(archivos.documentoId, arch.documentoId));
    if (doc?.estado !== "borrador" && n <= 1) {
      throw new DocumentoError(
        "Un documento publicado necesita al menos un archivo.",
      );
    }
    await tx.delete(archivos).where(eq(archivos.id, archivoId));
    await rebuildDocumentSearch(arch.documentoId, tx);
  });
}

export async function moverArchivo(
  archivoId: string,
  direction: "up" | "down",
) {
  await db.transaction(async (tx) => {
    const [arch] = await tx
      .select()
      .from(archivos)
      .where(eq(archivos.id, archivoId));
    if (!arch) return;
    const hermanos = await tx
      .select({ id: archivos.id })
      .from(archivos)
      .where(eq(archivos.documentoId, arch.documentoId))
      .orderBy(asc(archivos.orden), asc(archivos.nombre));
    const ids = hermanos.map((h) => h.id);
    const from = ids.indexOf(archivoId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    for (const [orden, id] of ids.entries()) {
      await tx.update(archivos).set({ orden }).where(eq(archivos.id, id));
    }
  });
}

/** Opciones de máquinas para el selector jerárquico del formulario. */
export async function opcionesMaquinas() {
  const [lins, mods] = await Promise.all([
    db
      .select({
        id: lineas.id,
        nombre: lineas.nombre,
        activo: lineas.activo,
        segmentoId: lineas.segmentoId,
      })
      .from(lineas)
      .orderBy(asc(lineas.orden), asc(lineas.nombre)),
    db
      .select({
        id: modelos.id,
        nombre: modelos.nombre,
        activo: modelos.activo,
        lineaId: modelos.lineaId,
      })
      .from(modelos)
      .orderBy(asc(modelos.orden), asc(modelos.nombre)),
  ]);
  return lins.map((l) => ({
    ...l,
    modelos: mods.filter((m) => m.lineaId === l.id),
  }));
}

/** Pendientes y advertencias para el panel del admin (docs/05). */
export async function resumenPanel() {
  const [[conteos], videosPublicos] = await Promise.all([
    db.execute<{
      borradores: number;
      revision: number;
      no_disponibles: number;
      errores_extraccion: number;
    }>(sql`
      SELECT
        (SELECT count(*)::int FROM documentos WHERE estado = 'borrador') AS borradores,
        (SELECT count(*)::int FROM documentos WHERE requiere_revision) AS revision,
        (SELECT count(*)::int FROM archivos WHERE NOT disponible) AS no_disponibles,
        (SELECT count(*)::int FROM archivos WHERE estado_extraccion = 'error') AS errores_extraccion
    `),
    db
      .select({
        documentoId: documentos.id,
        titulo: documentos.titulo,
        archivo: archivos.nombre,
      })
      .from(archivos)
      .innerJoin(documentos, eq(archivos.documentoId, documentos.id))
      .where(
        and(
          eq(archivos.modoAcceso, "publico"),
          eq(documentos.visibleConcesionarios, false),
          eq(documentos.visibleClientes, false),
        ),
      )
      .limit(50),
  ]);
  return { ...conteos, videosPublicos };
}

/** Vuelve a la cola del worker un archivo que falló o no tuvo texto. */
export async function reintentarExtraccion(archivoId: string) {
  await db
    .update(archivos)
    .set({ estadoExtraccion: "pendiente", extraccionError: null })
    .where(
      and(
        eq(archivos.id, archivoId),
        inArray(archivos.estadoExtraccion, ["error", "sin_texto"]),
      ),
    );
}

/** El admin revisó un documento cuyo archivo cambió en Drive. */
export async function marcarRevisado(documentoId: string, usuarioId: string) {
  await db
    .update(documentos)
    .set({ requiereRevision: false, actualizadoPor: usuarioId })
    .where(eq(documentos.id, documentoId));
}
