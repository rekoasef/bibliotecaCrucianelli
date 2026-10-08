import "server-only";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
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
  /** Solo clientes finales sin cuenta (usuario_id null). */
  soloClientes?: boolean;
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
  if (f.soloClientes) where.push(isNull(accesos.usuarioId));
  if (f.concesionarioId)
    where.push(eq(usuarios.concesionarioId, f.concesionarioId));
  if (f.documento) where.push(ilike(documentos.titulo, `%${f.documento}%`));
  if (f.desde) where.push(gte(accesos.creadoEn, inicioDelDia(f.desde)));
  if (f.hasta) {
    const fin = inicioDelDia(f.hasta);
    fin.setDate(fin.getDate() + 1);
    where.push(lt(accesos.creadoEn, fin));
  }

  return (
    db
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
      // Sin usuario = cliente final sin cuenta.
      .leftJoin(usuarios, eq(accesos.usuarioId, usuarios.id))
      .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
      .innerJoin(documentos, eq(accesos.documentoId, documentos.id))
      .leftJoin(archivos, eq(accesos.archivoId, archivos.id))
      .where(and(...where))
      .orderBy(desc(accesos.creadoEn))
      .limit(LIMIT)
  );
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

// ── Recurrencia ─────────────────────────────────────────────────────────────

export type Recurrencia = {
  /** Últimos N días; 0 = desde el principio. */
  dias: number;
  /** Con cuenta (fábrica y concesionarios) o clientes finales sin cuenta. */
  quien: "todos" | "usuarios" | "clientes";
  orden: "veces" | "az" | "za";
};

const RECURRENCIA_LIMIT = 300;

// Columnas de `busquedas` o `accesos` (las dos tienen creado_en y usuario_id).
const COLUMNAS = {
  busquedas: {
    creadoEn: sql`busquedas.creado_en`,
    usuarioId: sql`busquedas.usuario_id`,
  },
  accesos: {
    creadoEn: sql`accesos.creado_en`,
    usuarioId: sql`accesos.usuario_id`,
  },
};

function recurrenciaWhere(tabla: keyof typeof COLUMNAS, r: Recurrencia) {
  const { creadoEn, usuarioId } = COLUMNAS[tabla];
  const c: SQL[] = [];
  if (r.dias > 0)
    c.push(sql`${creadoEn} >= now() - make_interval(days => ${r.dias})`);
  if (r.quien === "usuarios") c.push(sql`${usuarioId} IS NOT NULL`);
  if (r.quien === "clientes") c.push(sql`${usuarioId} IS NULL`);
  return c.length ? sql.join(c, sql` AND `) : sql`TRUE`;
}

/** A→Z / Z→A sin distinguir acentos ni mayúsculas, o más frecuentes primero. */
function recurrenciaOrden(texto: SQL, r: Recurrencia) {
  if (r.orden === "az") return sql`f_unaccent_lower(${texto}) ASC`;
  if (r.orden === "za") return sql`f_unaccent_lower(${texto}) DESC`;
  return sql`veces DESC, ultima DESC`;
}

/**
 * Textos buscados y cuántas veces, agrupados sin distinguir acentos ni
 * mayúsculas ("Dosificador" y "dosificador" son la misma búsqueda).
 */
export async function busquedasFrecuentes(r: Recurrencia) {
  return db.execute<{
    texto: string;
    veces: number;
    sinResultados: number;
    ultima: string;
  }>(sql`
    SELECT * FROM (
      SELECT
        (array_agg(texto ORDER BY creado_en DESC))[1] AS texto,
        count(*)::int AS veces,
        count(*) FILTER (WHERE cantidad_resultados = 0)::int AS "sinResultados",
        max(creado_en) AS ultima
      FROM busquedas
      WHERE texto IS NOT NULL AND ${recurrenciaWhere("busquedas", r)}
      GROUP BY f_unaccent_lower(texto)
    ) b
    ORDER BY ${recurrenciaOrden(sql`b.texto`, r)}
    LIMIT ${RECURRENCIA_LIMIT}
  `);
}

/** Documentos y cuántas veces se consultaron (ficha, archivo o video). */
export async function documentosConsultados(r: Recurrencia) {
  return db.execute<{
    id: string;
    titulo: string | null;
    veces: number;
    descargas: number;
    ultima: string;
  }>(sql`
    SELECT * FROM (
      SELECT
        d.id,
        d.titulo,
        count(*)::int AS veces,
        count(*) FILTER (WHERE accesos.accion = 'descargar')::int AS descargas,
        max(accesos.creado_en) AS ultima
      FROM accesos JOIN documentos d ON d.id = accesos.documento_id
      WHERE ${recurrenciaWhere("accesos", r)}
      GROUP BY d.id
    ) a
    ORDER BY ${recurrenciaOrden(sql`coalesce(a.titulo, '')`, r)}
    LIMIT ${RECURRENCIA_LIMIT}
  `);
}

export { RECURRENCIA_LIMIT };
