import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { busquedas } from "@/db/schema";
import {
  documentVisibilityFilter,
  type Viewer,
} from "@/lib/documentos/visibility";
import { normalizeTag } from "@/lib/text";

type Executor = Pick<typeof db, "execute">;

import { MARK_END, MARK_START } from "./markers";

export const PAGE_SIZE = 20;
/** Con menos resultados que esto se complementa con similitud trigram. */
const FEW_RESULTS = 5;
/** Umbral de word_similarity para tolerar errores de tipeo ("sensr" → "sensor"). */
const TYPO_THRESHOLD = 0.5;

export type SearchFilters = {
  q?: string;
  linea?: string; // slug
  modelo?: string; // slug
  tipo?: string; // slug
  sistema?: string; // slug
  tema?: string; // slug
  etiqueta?: string; // nombre normalizado
  obsoletos?: boolean;
};

export type SearchResult = {
  id: string;
  titulo: string | null;
  estado: "borrador" | "vigente" | "obsoleto";
  tipoNombre: string | null;
  tipoSlug: string | null;
  maquinas: string | null;
  mimeTypes: string[];
  snippet: string | null;
  /** true si vino del complemento por similitud (no del texto completo). */
  aproximado: boolean;
};

/** Condiciones de filtro (máquina en dos niveles: docs/02, "Filtro por máquina"). */
function filterConditions(f: SearchFilters): SQL[] {
  const c: SQL[] = [];
  if (f.linea) {
    c.push(sql`(
      EXISTS (SELECT 1 FROM documento_lineas dl JOIN lineas l ON l.id = dl.linea_id
              WHERE dl.documento_id = documentos.id AND l.slug = ${f.linea})
      OR EXISTS (SELECT 1 FROM documento_modelos dm JOIN modelos m ON m.id = dm.modelo_id
                 JOIN lineas l ON l.id = m.linea_id
                 WHERE dm.documento_id = documentos.id AND l.slug = ${f.linea})
    )`);
  }
  if (f.modelo) {
    // El modelo y también lo asociado a su línea completa.
    c.push(sql`(
      EXISTS (SELECT 1 FROM documento_modelos dm JOIN modelos m ON m.id = dm.modelo_id
              WHERE dm.documento_id = documentos.id AND m.slug = ${f.modelo})
      OR EXISTS (SELECT 1 FROM documento_lineas dl JOIN modelos m ON m.linea_id = dl.linea_id
                 WHERE dl.documento_id = documentos.id AND m.slug = ${f.modelo})
    )`);
  }
  if (f.tipo) {
    c.push(
      sql`documentos.tipo_id = (SELECT id FROM tipos WHERE slug = ${f.tipo})`,
    );
  }
  if (f.sistema) {
    c.push(sql`EXISTS (SELECT 1 FROM documento_sistemas ds JOIN sistemas s ON s.id = ds.sistema_id
                       WHERE ds.documento_id = documentos.id AND s.slug = ${f.sistema})`);
  }
  if (f.tema) {
    c.push(sql`EXISTS (SELECT 1 FROM documento_temas dt JOIN temas t ON t.id = dt.tema_id
                       WHERE dt.documento_id = documentos.id AND t.slug = ${f.tema})`);
  }
  if (f.etiqueta) {
    c.push(sql`EXISTS (SELECT 1 FROM documento_etiquetas de JOIN etiquetas e ON e.id = de.etiqueta_id
                       WHERE de.documento_id = documentos.id AND e.nombre_normalizado = ${normalizeTag(f.etiqueta)})`);
  }
  if (!f.obsoletos) c.push(sql`documentos.estado <> 'obsoleto'`);
  return c;
}

function joinAnd(conditions: (SQL | undefined)[]) {
  const defined = conditions.filter((c): c is SQL => c !== undefined);
  return defined.length ? sql.join(defined, sql` AND `) : sql`TRUE`;
}

// Columnas comunes de la tarjeta de resultado.
const cardColumns = sql`
  documentos.id,
  documentos.titulo,
  documentos.estado,
  t.nombre AS "tipoNombre",
  t.slug AS "tipoSlug",
  (SELECT string_agg(nombre, ', ') FROM (
     SELECT l.nombre, l.orden AS o1, -1 AS o2 FROM documento_lineas dl
       JOIN lineas l ON l.id = dl.linea_id WHERE dl.documento_id = documentos.id
     UNION ALL
     SELECT m.nombre, l.orden, m.orden FROM documento_modelos dm
       JOIN modelos m ON m.id = dm.modelo_id JOIN lineas l ON l.id = m.linea_id
       WHERE dm.documento_id = documentos.id
     ORDER BY 2, 3
   ) maq) AS maquinas,
  coalesce((SELECT array_agg(DISTINCT a.mime_type) FROM archivos a
            WHERE a.documento_id = documentos.id), '{}') AS "mimeTypes"
`;

// Más específico = asociado a un modelo puntual, con un solo sistema / tema (docs/02).
const especificidad = sql`(
  (CASE WHEN EXISTS (SELECT 1 FROM documento_modelos dm WHERE dm.documento_id = documentos.id) THEN 1 ELSE 0 END)
  + (CASE WHEN (SELECT count(*) FROM documento_sistemas ds WHERE ds.documento_id = documentos.id) = 1 THEN 1 ELSE 0 END)
  + (CASE WHEN (SELECT count(*) FROM documento_temas dt WHERE dt.documento_id = documentos.id) = 1 THEN 1 ELSE 0 END)
)`;

/**
 * Búsqueda de documentos (docs/02, "Consulta"). Siempre aplica la visibilidad del
 * usuario. `limit` crece con "Cargar más" (página × PAGE_SIZE).
 */
export async function searchDocuments(
  filters: SearchFilters,
  viewer: Viewer,
  limit = PAGE_SIZE,
  tx: Executor = db,
): Promise<{ total: number; results: SearchResult[] }> {
  const q = filters.q?.trim().slice(0, 200) ?? "";
  const base = [documentVisibilityFilter(viewer), ...filterConditions(filters)];

  if (!q) {
    // Solo filtros (navegación): más recientes primero.
    const rows = await tx.execute<SearchResult & { total: number }>(sql`
      SELECT ${cardColumns},
        left(documentos.descripcion, 200) AS snippet,
        false AS aproximado,
        count(*) OVER()::int AS total
      FROM documentos LEFT JOIN tipos t ON t.id = documentos.tipo_id
      WHERE ${joinAnd(base)}
      ORDER BY (documentos.estado = 'obsoleto'), ${especificidad} DESC,
               coalesce(documentos.publicado_en, documentos.creado_en) DESC
      LIMIT ${limit}
    `);
    return { total: rows[0]?.total ?? 0, results: [...rows] };
  }

  const fts = await tx.execute<SearchResult & { total: number }>(sql`
    WITH consulta AS (SELECT websearch_to_tsquery('es_unaccent', ${q}) AS query)
    SELECT ${cardColumns},
      ts_headline('es_unaccent',
        -- Descripción; si no hay, el texto de los archivos (recortado: ts_headline es costoso).
        coalesce(
          nullif(documentos.descripcion, ''),
          (SELECT left(string_agg(a.texto_extraido, ' ' ORDER BY a.orden), 20000)
           FROM archivos a WHERE a.documento_id = documentos.id),
          ''
        ),
        consulta.query,
        ${`StartSel=${MARK_START}, StopSel=${MARK_END}, MaxFragments=1, MaxWords=30, MinWords=12, ShortWord=2, HighlightAll=false`}
      ) AS snippet,
      false AS aproximado,
      count(*) OVER()::int AS total
    FROM documentos LEFT JOIN tipos t ON t.id = documentos.tipo_id, consulta
    WHERE ${joinAnd(base)} AND documentos.busqueda @@ consulta.query
    ORDER BY (documentos.estado = 'obsoleto'),
             ts_rank_cd(documentos.busqueda, consulta.query) DESC,
             ${especificidad} DESC,
             coalesce(documentos.publicado_en, documentos.creado_en) DESC
    LIMIT ${limit}
  `);
  const results: SearchResult[] = [...fts];
  let total = fts[0]?.total ?? 0;

  // Pocos resultados: complementar por similitud trigram sobre título y etiquetas.
  if (total < FEW_RESULTS) {
    const qNorm = normalizeTag(q);
    const ids = results.map((r) => r.id);
    const excluir = ids.length
      ? sql`AND documentos.id NOT IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``;
    const similares = await tx.execute<SearchResult & { sim: number }>(sql`
      SELECT * FROM (
        SELECT ${cardColumns},
          left(documentos.descripcion, 200) AS snippet,
          true AS aproximado,
          greatest(
            word_similarity(${qNorm}, f_unaccent_lower(coalesce(documentos.titulo, ''))),
            coalesce((SELECT max(word_similarity(${qNorm}, e.nombre_normalizado))
                      FROM documento_etiquetas de JOIN etiquetas e ON e.id = de.etiqueta_id
                      WHERE de.documento_id = documentos.id), 0)
          ) AS sim
        FROM documentos LEFT JOIN tipos t ON t.id = documentos.tipo_id
        WHERE ${joinAnd(base)} ${excluir}
      ) s
      WHERE s.sim >= ${TYPO_THRESHOLD}
      ORDER BY (s.estado = 'obsoleto'), s.sim DESC
      LIMIT ${Math.max(limit - results.length, 0)}
    `);
    results.push(...similares);
    total += similares.length;
  }

  return { total, results };
}

/** Registra la búsqueda (docs/03). Las sin resultados alimentan el panel del admin. */
export async function registrarBusqueda(input: {
  usuarioId: string;
  filters: SearchFilters;
  cantidad: number;
}) {
  const { q, obsoletos, ...resto } = input.filters;
  const filtros: Record<string, string> = Object.fromEntries(
    Object.entries(resto).filter(
      (e): e is [string, string] => typeof e[1] === "string" && e[1] !== "",
    ),
  );
  if (obsoletos) filtros.obsoletos = "1";
  await db.insert(busquedas).values({
    usuarioId: input.usuarioId,
    texto: q?.trim() || null,
    filtros,
    cantidadResultados: input.cantidad,
  });
}

/** Últimos documentos publicados que el usuario puede ver (inicio). */
export async function latestDocuments(
  viewer: Viewer,
  limit = 6,
): Promise<SearchResult[]> {
  const rows = await db.execute<SearchResult>(sql`
    SELECT ${cardColumns}, left(documentos.descripcion, 200) AS snippet, false AS aproximado
    FROM documentos LEFT JOIN tipos t ON t.id = documentos.tipo_id
    WHERE ${joinAnd([documentVisibilityFilter(viewer), sql`documentos.estado = 'vigente'`])}
    ORDER BY coalesce(documentos.publicado_en, documentos.creado_en) DESC
    LIMIT ${limit}
  `);
  return [...rows];
}
