import "server-only";
import { and, desc, eq, gte, ilike, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  accesos,
  archivos,
  concesionarios,
  documentos,
  usuarios,
} from "@/db/schema";

export type AccesosFilters = {
  usuarioId?: string;
  concesionarioId?: string;
  documento?: string; // texto en el título
  desde?: string; // YYYY-MM-DD (hora de Argentina)
  hasta?: string; // YYYY-MM-DD inclusive
};

const LIMIT = 300;

/** Fecha local de Argentina (00:00) como Date, para filtrar por día. */
function inicioDelDia(fecha: string) {
  return new Date(`${fecha}T00:00:00-03:00`);
}

export async function listAccesos(f: AccesosFilters) {
  const where: SQL[] = [];
  if (f.usuarioId) where.push(eq(accesos.usuarioId, f.usuarioId));
  if (f.concesionarioId)
    where.push(eq(usuarios.concesionarioId, f.concesionarioId));
  if (f.documento) where.push(ilike(documentos.titulo, `%${f.documento}%`));
  if (f.desde) where.push(gte(accesos.creadoEn, inicioDelDia(f.desde)));
  if (f.hasta) {
    const fin = inicioDelDia(f.hasta);
    fin.setDate(fin.getDate() + 1);
    where.push(lt(accesos.creadoEn, fin));
  }

  return db
    .select({
      id: accesos.id,
      creadoEn: accesos.creadoEn,
      accion: accesos.accion,
      usuarioNombre: usuarios.nombre,
      usuarioEmail: usuarios.email,
      concesionarioNombre: concesionarios.nombre,
      documentoId: documentos.id,
      documentoTitulo: documentos.titulo,
      archivoNombre: archivos.nombre,
    })
    .from(accesos)
    .innerJoin(usuarios, eq(accesos.usuarioId, usuarios.id))
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .innerJoin(documentos, eq(accesos.documentoId, documentos.id))
    .leftJoin(archivos, eq(accesos.archivoId, archivos.id))
    .where(and(...where))
    .orderBy(desc(accesos.creadoEn))
    .limit(LIMIT);
}

export const ACCESOS_LIMIT = LIMIT;

/**
 * Búsquedas sin resultados de los últimos `dias`, agrupadas por texto normalizado
 * (minúsculas, sin acentos): qué se busca y no se encuentra (docs/05).
 */
export async function busquedasSinResultados(dias = 30, limit = 100) {
  return db.execute<{ texto: string; veces: number; ultima: Date }>(sql`
    SELECT
      (array_agg(texto ORDER BY creado_en DESC))[1] AS texto,
      count(*)::int AS veces,
      max(creado_en) AS ultima
    FROM busquedas
    WHERE cantidad_resultados = 0
      AND texto IS NOT NULL
      AND creado_en >= now() - make_interval(days => ${dias})
    GROUP BY f_unaccent_lower(texto)
    ORDER BY veces DESC, ultima DESC
    LIMIT ${limit}
  `);
}
