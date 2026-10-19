/**
 * Consultas de máquinas, catálogos y etiquetas, y orden manual de las listas.
 *
 * @module
 */

import "server-only";
import { and, asc, eq, ilike, max, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  etiquetas,
  lineas,
  modelos,
  productos,
  segmentos,
  sistemas,
  tecnologias,
  temas,
  tipos,
} from "@/db/schema";
import type { Catalogo, Nivel } from "@/lib/validation/taxonomia";
import { containsPattern, normalizeTag } from "@/lib/text";

/** Tabla de cada catálogo, por nombre. */
export const catalogoTables = {
  tipos,
  sistemas,
  temas,
  productos,
  tecnologias,
} as const;

// ── Máquinas ────────────────────────────────────────────────────────────────

/**
 * Árbol completo Segmento → Línea → Modelo para el admin (incluye inactivos),
 * en el orden manual.
 */
export async function getArbolMaquinas() {
  const [segs, lins, cantidades] = await Promise.all([
    db
      .select()
      .from(segmentos)
      .orderBy(asc(segmentos.orden), asc(segmentos.nombre)),
    db.select().from(lineas).orderBy(asc(lineas.orden), asc(lineas.nombre)),
    db
      .select({
        lineaId: modelos.lineaId,
        cantidad: sql<number>`count(*)::int`,
      })
      .from(modelos)
      .groupBy(modelos.lineaId),
  ]);
  const modelosPorLinea = new Map(
    cantidades.map((c) => [c.lineaId, c.cantidad]),
  );

  return segs.map((s) => ({
    ...s,
    lineas: lins
      .filter((l) => l.segmentoId === s.id)
      .map((l) => ({ ...l, cantidadModelos: modelosPorLinea.get(l.id) ?? 0 })),
  }));
}

/** Segmentos activos con sus líneas activas, para la navegación de usuarios. */
export async function getSegmentosActivosConLineas() {
  const rows = await db
    .select({
      segmentoId: segmentos.id,
      segmentoNombre: segmentos.nombre,
      lineaNombre: lineas.nombre,
      lineaSlug: lineas.slug,
    })
    .from(lineas)
    .innerJoin(segmentos, eq(lineas.segmentoId, segmentos.id))
    .where(and(eq(segmentos.activo, true), eq(lineas.activo, true)))
    .orderBy(
      asc(segmentos.orden),
      asc(segmentos.nombre),
      asc(lineas.orden),
      asc(lineas.nombre),
    );

  const result: {
    id: string;
    nombre: string;
    lineas: { nombre: string; slug: string }[];
  }[] = [];
  for (const r of rows) {
    let seg = result.at(-1);
    if (seg?.id !== r.segmentoId) {
      seg = { id: r.segmentoId, nombre: r.segmentoNombre, lineas: [] };
      result.push(seg);
    }
    seg.lineas.push({ nombre: r.lineaNombre, slug: r.lineaSlug });
  }
  return result;
}

/** Todos los segmentos, en el orden manual. */
export async function listSegmentos() {
  return db
    .select()
    .from(segmentos)
    .orderBy(asc(segmentos.orden), asc(segmentos.nombre));
}

/** Todas las líneas con el nombre de su segmento (selectores del admin). */
export async function listLineasConSegmento() {
  return db
    .select({
      id: lineas.id,
      nombre: lineas.nombre,
      segmentoNombre: segmentos.nombre,
    })
    .from(lineas)
    .innerJoin(segmentos, eq(lineas.segmentoId, segmentos.id))
    .orderBy(asc(segmentos.orden), asc(lineas.orden), asc(lineas.nombre));
}

/**
 * Un segmento, o `null`.
 *
 * @param id - ID del segmento.
 */
export async function getSegmento(id: string) {
  const [row] = await db.select().from(segmentos).where(eq(segmentos.id, id));
  return row ?? null;
}

/**
 * Una línea, o `null`.
 *
 * @param id - ID de la línea.
 */
export async function getLinea(id: string) {
  const [row] = await db.select().from(lineas).where(eq(lineas.id, id));
  return row ?? null;
}

/**
 * Un modelo, o `null`.
 *
 * @param id - ID del modelo.
 */
export async function getModelo(id: string) {
  const [row] = await db.select().from(modelos).where(eq(modelos.id, id));
  return row ?? null;
}

/**
 * Modelos de una línea, en el orden manual.
 *
 * @param lineaId - Línea.
 */
export async function listModelosDeLinea(lineaId: string) {
  return db
    .select()
    .from(modelos)
    .where(eq(modelos.lineaId, lineaId))
    .orderBy(asc(modelos.orden), asc(modelos.nombre));
}

// ── Orden ───────────────────────────────────────────────────────────────────

/** Tabla con columnas `id` y `orden`. */
type Ordenable = PgTable & {
  id: PgColumn;
  orden: PgColumn;
  nombre: PgColumn;
};

/**
 * Configuración de cada tabla ordenable: con qué columna se agrupan los
 * hermanos.
 */
const ORDENABLES: Record<
  Nivel | Catalogo,
  { table: Ordenable; parent?: PgColumn }
> = {
  segmentos: { table: segmentos },
  lineas: { table: lineas, parent: lineas.segmentoId },
  modelos: { table: modelos, parent: modelos.lineaId },
  tipos: { table: tipos },
  sistemas: { table: sistemas },
  temas: { table: temas },
  productos: { table: productos },
  tecnologias: { table: tecnologias },
};

/**
 * Próximo valor de `orden` al final de la lista (dentro del padre si
 * corresponde).
 *
 * @param kind - Nivel de máquina o catálogo.
 * @param parentId - Segmento (para líneas) o línea (para modelos).
 */
export async function nextOrden(kind: Nivel | Catalogo, parentId?: string) {
  const { table, parent } = ORDENABLES[kind];
  const [row] = await db
    .select({ max: max(table.orden) })
    .from(table)
    .where(parent && parentId ? eq(parent, parentId) : undefined);
  return ((row?.max as number | null) ?? -1) + 1;
}

/**
 * Sube o baja un ítem un lugar entre sus hermanos y renumera la lista (0, 1,
 * 2…) para que el orden quede siempre consistente.
 *
 * @param kind - Nivel de máquina o catálogo.
 * @param id - Ítem a mover.
 * @param direction - `up` o `down`.
 */
export async function moveItem(
  kind: Nivel | Catalogo,
  id: string,
  direction: "up" | "down",
) {
  const { table, parent } = ORDENABLES[kind];

  await db.transaction(async (tx) => {
    let where: SQL | undefined;
    if (parent) {
      const [item] = await tx
        .select({ parentId: parent })
        .from(table)
        .where(eq(table.id, id));
      if (!item) return;
      where = eq(parent, item.parentId as string);
    }

    const hermanos = await tx
      .select({ id: table.id })
      .from(table)
      .where(where)
      .orderBy(asc(table.orden), asc(table.nombre));
    const ids = hermanos.map((h) => h.id as string);

    const from = ids.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];

    for (const [orden, itemId] of ids.entries()) {
      await tx
        .update(table)
        .set({ orden } as never)
        .where(eq(table.id, itemId));
    }
  });
}

// ── Tipos, sistemas, temas, productos ──────────────────────────────────────────────────

/**
 * Entradas de un catálogo (incluye inactivas), en el orden manual.
 *
 * @param kind - Catálogo.
 */
export async function listCatalogo(kind: Catalogo) {
  const table = catalogoTables[kind];
  return db.select().from(table).orderBy(asc(table.orden), asc(table.nombre));
}

/** Tipos activos, para accesos rápidos y formularios. */
export async function listTiposActivos() {
  return db
    .select({ nombre: tipos.nombre, slug: tipos.slug })
    .from(tipos)
    .where(eq(tipos.activo, true))
    .orderBy(asc(tipos.orden), asc(tipos.nombre));
}

// ── Etiquetas ───────────────────────────────────────────────────────────────

/**
 * Etiquetas con su cantidad de usos, alfabéticas (hasta 300).
 *
 * @param q - Filtro opcional: contiene el texto, sin distinguir acentos ni
 *   mayúsculas.
 */
export async function listEtiquetas(q?: string) {
  const filtro = q ? normalizeTag(q) : "";
  return db
    .select({
      id: etiquetas.id,
      nombre: etiquetas.nombre,
      nombreNormalizado: etiquetas.nombreNormalizado,
      usos: sql<number>`(SELECT count(*)::int FROM documento_etiquetas de WHERE de.etiqueta_id = ${etiquetas.id})`,
    })
    .from(etiquetas)
    .where(
      filtro
        ? ilike(etiquetas.nombreNormalizado, containsPattern(filtro))
        : undefined,
    )
    .orderBy(asc(etiquetas.nombreNormalizado))
    .limit(300);
}

/** Cantidad total de etiquetas. */
export async function countEtiquetas() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(etiquetas);
  return row.n;
}

/**
 * Si el nombre ya existe como tipo, sistema, tema, producto, tecnología, línea
 * o modelo (docs/04: no repetir como etiqueta algo que ya es otra
 * clasificación).
 *
 * @param nombreNormalizado - Nombre en forma normalizada (`normalizeTag`).
 * @param tx - Base o transacción.
 * @returns Dónde existe y con qué nombre, o `null`.
 */
export async function findClasificacionExistente(
  nombreNormalizado: string,
  tx: Pick<typeof db, "execute"> = db,
) {
  const rows = await tx.execute<{ donde: string; nombre: string }>(sql`
    SELECT 'tipo' AS donde, nombre FROM tipos WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'sistema', nombre FROM sistemas WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'tema', nombre FROM temas WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'producto', nombre FROM productos WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'tecnología', nombre FROM tecnologias WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'línea', nombre FROM lineas WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    UNION ALL SELECT 'modelo', nombre FROM modelos WHERE f_unaccent_lower(nombre) = ${nombreNormalizado}
    LIMIT 1
  `);
  return rows[0] ?? null;
}
