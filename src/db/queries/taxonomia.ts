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
import { normalizeTag } from "@/lib/text";

export const catalogoTables = {
  tipos,
  sistemas,
  temas,
  productos,
  tecnologias,
} as const;

// ── Máquinas ────────────────────────────────────────────────────────────────

/** Árbol completo para el admin (incluye inactivos). */
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

export async function listSegmentos() {
  return db
    .select()
    .from(segmentos)
    .orderBy(asc(segmentos.orden), asc(segmentos.nombre));
}

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

export async function getSegmento(id: string) {
  const [row] = await db.select().from(segmentos).where(eq(segmentos.id, id));
  return row ?? null;
}

export async function getLinea(id: string) {
  const [row] = await db.select().from(lineas).where(eq(lineas.id, id));
  return row ?? null;
}

export async function getModelo(id: string) {
  const [row] = await db.select().from(modelos).where(eq(modelos.id, id));
  return row ?? null;
}

export async function listModelosDeLinea(lineaId: string) {
  return db
    .select()
    .from(modelos)
    .where(eq(modelos.lineaId, lineaId))
    .orderBy(asc(modelos.orden), asc(modelos.nombre));
}

// ── Orden ───────────────────────────────────────────────────────────────────

type Ordenable = PgTable & {
  id: PgColumn;
  orden: PgColumn;
  nombre: PgColumn;
};

/** Configuración de cada tabla ordenable: con qué columna se agrupan los hermanos. */
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

/** Próximo valor de `orden` al final de la lista (dentro del padre si corresponde). */
export async function nextOrden(kind: Nivel | Catalogo, parentId?: string) {
  const { table, parent } = ORDENABLES[kind];
  const [row] = await db
    .select({ max: max(table.orden) })
    .from(table)
    .where(parent && parentId ? eq(parent, parentId) : undefined);
  return ((row?.max as number | null) ?? -1) + 1;
}

/**
 * Sube o baja un ítem un lugar entre sus hermanos y renumera la lista (0, 1, 2…)
 * para que el orden quede siempre consistente.
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
      filtro ? ilike(etiquetas.nombreNormalizado, `%${filtro}%`) : undefined,
    )
    .orderBy(asc(etiquetas.nombreNormalizado))
    .limit(300);
}

export async function countEtiquetas() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(etiquetas);
  return row.n;
}

/**
 * Si el nombre ya existe como tipo, sistema, tema, producto, tecnología, línea o modelo, lo devuelve
 * (docs/04: no repetir como etiqueta algo que ya es otra clasificación).
 */
export async function findClasificacionExistente(nombreNormalizado: string) {
  const rows = await db.execute<{ donde: string; nombre: string }>(sql`
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
