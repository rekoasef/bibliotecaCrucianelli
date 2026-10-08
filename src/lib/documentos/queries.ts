import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accesos,
  archivos,
  documentoEtiquetas,
  documentoLineas,
  documentoModelos,
  documentoProductos,
  documentoSistemas,
  documentoTecnologias,
  documentoTemas,
  documentos,
  etiquetas,
  lineas,
  modelos,
  productos,
  sistemas,
  tecnologias,
  temas,
  tipos,
} from "@/db/schema";
import { documentVisibilityFilter, type Viewer } from "./visibility";

/**
 * Archivo tal como se manda al cliente. `driveFileId` solo viaja si el archivo es
 * de modo público (videos con link de Drive): CLAUDE.md, regla 3.
 */
export type ArchivoPublico = {
  id: string;
  nombre: string;
  mimeType: string;
  tamanoBytes: number | null;
  modoAcceso: "servidor" | "publico";
  disponible: boolean;
  driveFileId: string | null;
};

/** Ficha de un documento si el usuario puede verlo; null si no existe o no tiene permiso. */
export async function getDocumentoVisible(id: string, viewer: Viewer) {
  const [doc] = await db
    .select({
      id: documentos.id,
      titulo: documentos.titulo,
      descripcion: documentos.descripcion,
      estado: documentos.estado,
      visibleConcesionarios: documentos.visibleConcesionarios,
      visibleClientes: documentos.visibleClientes,
      version: documentos.version,
      fechaDocumento: documentos.fechaDocumento,
      publicadoEn: documentos.publicadoEn,
      actualizadoEn: documentos.actualizadoEn,
      reemplazadoPorId: documentos.reemplazadoPorId,
      tipoNombre: tipos.nombre,
      tipoSlug: tipos.slug,
    })
    .from(documentos)
    .leftJoin(tipos, eq(documentos.tipoId, tipos.id))
    .where(and(eq(documentos.id, id), documentVisibilityFilter(viewer)));
  if (!doc) return null;

  const soloActivos = viewer.rol !== "admin";
  const [arch, lins, mods, sis, tems, prods, tecs, etqs] = await Promise.all([
    db
      .select()
      .from(archivos)
      .where(eq(archivos.documentoId, id))
      .orderBy(asc(archivos.orden), asc(archivos.nombre)),
    db
      .select({ nombre: lineas.nombre, slug: lineas.slug })
      .from(documentoLineas)
      .innerJoin(lineas, eq(documentoLineas.itemId, lineas.id))
      .where(
        and(
          eq(documentoLineas.documentoId, id),
          soloActivos ? eq(lineas.activo, true) : undefined,
        ),
      )
      .orderBy(asc(lineas.orden)),
    db
      .select({
        nombre: modelos.nombre,
        slug: modelos.slug,
        lineaSlug: lineas.slug,
      })
      .from(documentoModelos)
      .innerJoin(modelos, eq(documentoModelos.itemId, modelos.id))
      .innerJoin(lineas, eq(modelos.lineaId, lineas.id))
      .where(
        and(
          eq(documentoModelos.documentoId, id),
          soloActivos
            ? and(eq(modelos.activo, true), eq(lineas.activo, true))
            : undefined,
        ),
      )
      .orderBy(asc(lineas.orden), asc(modelos.orden)),
    db
      .select({ nombre: sistemas.nombre, slug: sistemas.slug })
      .from(documentoSistemas)
      .innerJoin(sistemas, eq(documentoSistemas.itemId, sistemas.id))
      .where(eq(documentoSistemas.documentoId, id))
      .orderBy(asc(sistemas.orden)),
    db
      .select({ nombre: temas.nombre, slug: temas.slug })
      .from(documentoTemas)
      .innerJoin(temas, eq(documentoTemas.itemId, temas.id))
      .where(eq(documentoTemas.documentoId, id))
      .orderBy(asc(temas.orden)),
    db
      .select({ nombre: productos.nombre, slug: productos.slug })
      .from(documentoProductos)
      .innerJoin(productos, eq(documentoProductos.itemId, productos.id))
      .where(eq(documentoProductos.documentoId, id))
      .orderBy(asc(productos.orden)),
    db
      .select({ nombre: tecnologias.nombre, slug: tecnologias.slug })
      .from(documentoTecnologias)
      .innerJoin(tecnologias, eq(documentoTecnologias.itemId, tecnologias.id))
      .where(eq(documentoTecnologias.documentoId, id))
      .orderBy(asc(tecnologias.orden)),
    db
      .select({
        nombre: etiquetas.nombre,
        normalizado: etiquetas.nombreNormalizado,
      })
      .from(documentoEtiquetas)
      .innerJoin(etiquetas, eq(documentoEtiquetas.itemId, etiquetas.id))
      .where(eq(documentoEtiquetas.documentoId, id))
      .orderBy(asc(etiquetas.nombreNormalizado)),
  ]);

  const archivosCliente: ArchivoPublico[] = arch.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    mimeType: a.mimeType,
    tamanoBytes: a.tamanoBytes,
    modoAcceso: a.modoAcceso,
    disponible: a.disponible,
    driveFileId: a.modoAcceso === "publico" ? a.driveFileId : null,
  }));

  return {
    ...doc,
    archivos: archivosCliente,
    lineas: lins,
    modelos: mods,
    sistemas: sis,
    temas: tems,
    productos: prods,
    tecnologias: tecs,
    etiquetas: etqs,
    historial: await getHistorial(id, viewer),
  };
}

export type FichaDocumento = NonNullable<
  Awaited<ReturnType<typeof getDocumentoVisible>>
>;

/**
 * Cadena de versiones (de la más nueva a la más vieja) recorriendo reemplazado_por_id
 * en ambas direcciones. Solo incluye las versiones que el usuario puede ver.
 */
async function getHistorial(id: string, viewer: Viewer) {
  const cadena = await db.execute<{ id: string; profundidad: number }>(sql`
    WITH RECURSIVE
      posteriores AS (
        SELECT id, reemplazado_por_id, 0 AS profundidad FROM documentos WHERE id = ${id}
        UNION ALL
        SELECT d.id, d.reemplazado_por_id, p.profundidad - 1
        FROM documentos d JOIN posteriores p ON d.id = p.reemplazado_por_id
        WHERE p.profundidad > -50
      ),
      anteriores AS (
        SELECT id, 0 AS profundidad FROM documentos WHERE id = ${id}
        UNION ALL
        SELECT d.id, a.profundidad + 1
        FROM documentos d JOIN anteriores a ON d.reemplazado_por_id = a.id
        WHERE a.profundidad < 50
      )
    SELECT id, profundidad FROM posteriores
    UNION
    SELECT id, profundidad FROM anteriores
  `);
  if (cadena.length <= 1) return [];

  const orden = new Map(cadena.map((c) => [c.id, c.profundidad]));
  const visibles = await db
    .select({
      id: documentos.id,
      titulo: documentos.titulo,
      version: documentos.version,
      estado: documentos.estado,
      publicadoEn: documentos.publicadoEn,
    })
    .from(documentos)
    .where(
      and(
        inArray(documentos.id, [...orden.keys()]),
        documentVisibilityFilter(viewer),
      ),
    );
  return visibles.sort((a, b) => orden.get(a.id)! - orden.get(b.id)!);
}

/**
 * Archivo + documento si el usuario puede ver el documento. Es la única puerta de
 * entrada de /api/archivos/[id]: usa la misma función de visibilidad que todo lo demás.
 */
export async function getArchivoVisible(archivoId: string, viewer: Viewer) {
  const [row] = await db
    .select({
      id: archivos.id,
      documentoId: archivos.documentoId,
      driveFileId: archivos.driveFileId,
      nombre: archivos.nombre,
      mimeType: archivos.mimeType,
      disponible: archivos.disponible,
    })
    .from(archivos)
    .innerJoin(documentos, eq(archivos.documentoId, documentos.id))
    .where(and(eq(archivos.id, archivoId), documentVisibilityFilter(viewer)));
  return row ?? null;
}

export async function registrarAcceso(input: {
  /** null = cliente final sin cuenta. */
  usuarioId: string | null;
  documentoId: string;
  archivoId?: string;
  accion: "ver" | "descargar" | "video";
}) {
  await db.insert(accesos).values({
    usuarioId: input.usuarioId,
    documentoId: input.documentoId,
    archivoId: input.archivoId ?? null,
    accion: input.accion,
  });
}
