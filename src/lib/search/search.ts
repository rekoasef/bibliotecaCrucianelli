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
  producto?: string; // slug
  tecnologia?: string; // slug
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
  /** PDFs del documento y páginas donde aparece lo buscado (solo texto completo). */
  paginas?: PaginasArchivo[] | null;
};

export type PaginasArchivo = {
  nombre: string;
  /** Primeras MAX_PAGINAS páginas, en orden. */
  paginas: number[];
  /** Cuántas páginas más coinciden. */
  mas: number;
};

/** Páginas que se listan por archivo en el resultado. */
const MAX_PAGINAS = 5;

export type SearchResponse = {
  total: number;
  results: SearchResult[];
  /** Consulta corregida que se usó en lugar de la escrita ("dosificacin" → "dosificacion"). */
  correccion?: string;
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
  if (f.producto) {
    c.push(sql`EXISTS (SELECT 1 FROM documento_productos dp JOIN productos p ON p.id = dp.producto_id
                       WHERE dp.documento_id = documentos.id AND p.slug = ${f.producto})`);
  }
  if (f.tecnologia) {
    c.push(sql`EXISTS (SELECT 1 FROM documento_tecnologias dte JOIN tecnologias te ON te.id = dte.tecnologia_id
                       WHERE dte.documento_id = documentos.id AND te.slug = ${f.tecnologia})`);
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

/** Texto completo sobre `documentos.busqueda`, ordenado por relevancia. */
async function fullTextSearch(
  q: string,
  where: SQL,
  limit: number,
  tx: Executor,
): Promise<{ total: number; results: SearchResult[] }> {
  const rows = await tx.execute<SearchResult & { total: number }>(sql`
    WITH consulta AS (SELECT websearch_to_tsquery('es_unaccent', ${q}) AS query)
    SELECT ${cardColumns},
      ts_headline('es_unaccent',
        -- Descripción; si no hay, el texto de los archivos (recortado: ts_headline es costoso).
        coalesce(
          nullif(documentos.descripcion, ''),
          (SELECT translate(left(string_agg(a.texto_extraido, ' ' ORDER BY a.orden), 20000), E'\f', ' ')
           FROM archivos a WHERE a.documento_id = documentos.id),
          ''
        ),
        consulta.query,
        ${`StartSel=${MARK_START}, StopSel=${MARK_END}, MaxFragments=1, MaxWords=30, MinWords=12, ShortWord=2, HighlightAll=false`}
      ) AS snippet,
      false AS aproximado,
      (SELECT json_agg(json_build_object(
                'nombre', x.nombre, 'paginas', x.paginas, 'mas', x.mas) ORDER BY x.orden)
       FROM (
         SELECT a.nombre, a.orden,
           (array_agg(ap.pagina ORDER BY ap.pagina))[1:${MAX_PAGINAS}] AS paginas,
           greatest(count(*) - ${MAX_PAGINAS}, 0) AS mas
         FROM archivos a JOIN archivo_paginas ap ON ap.archivo_id = a.id
         WHERE a.documento_id = documentos.id AND a.disponible
           AND ap.busqueda @@ consulta.query
         GROUP BY a.id
       ) x) AS paginas,
      count(*) OVER()::int AS total
    FROM documentos LEFT JOIN tipos t ON t.id = documentos.tipo_id, consulta
    WHERE ${where} AND documentos.busqueda @@ consulta.query
    ORDER BY (documentos.estado = 'obsoleto'),
             ts_rank_cd(documentos.busqueda, consulta.query) DESC,
             ${especificidad} DESC,
             coalesce(documentos.publicado_en, documentos.creado_en) DESC
    LIMIT ${limit}
  `);
  return { total: rows[0]?.total ?? 0, results: [...rows] };
}

/** Palabras de la consulta, normalizadas como en `vocabulario` (migración 0008). */
export function queryWords(q: string): string[] {
  const words = normalizeTag(q).match(/[a-z]+/g) ?? [];
  return [...new Set(words)].filter((w) => w.length >= 4 && w.length <= 30);
}

/**
 * Corrige las palabras de la consulta que no existen en la biblioteca por la más
 * parecida del vocabulario ("dosificacin" → "dosificacion"): hasta 1 letra de
 * diferencia en palabras de 4 o 5 letras, hasta 2 en las más largas. Solo propone
 * palabras que aparecen en algún documento que el usuario puede ver, así la
 * corrección no revela el contenido de documentos ocultos. Devuelve la consulta
 * corregida, o null si no hay nada que corregir.
 */
async function correctQuery(
  q: string,
  viewer: Viewer,
  tx: Executor,
): Promise<string | null> {
  const words = queryWords(q);
  if (!words.length) return null;

  const rows = await tx.execute<{ original: string; sugerida: string }>(sql`
    SELECT w.palabra AS original, c.palabra AS sugerida
    FROM unnest(ARRAY[${sql.join(
      words.map((w) => sql`${w}`),
      sql`, `,
    )}]::text[]) AS w(palabra)
    CROSS JOIN LATERAL (
      SELECT v.palabra FROM vocabulario v
      WHERE v.palabra % w.palabra
        AND levenshtein(v.palabra, w.palabra)
            <= CASE WHEN length(w.palabra) <= 5 THEN 1 ELSE 2 END
        AND EXISTS (
          SELECT 1 FROM documentos
          WHERE ${joinAnd([documentVisibilityFilter(viewer)])}
            AND documentos.busqueda @@ plainto_tsquery('es_unaccent', v.palabra)
        )
      ORDER BY levenshtein(v.palabra, w.palabra),
               similarity(v.palabra, w.palabra) DESC, v.palabra
      LIMIT 1
    ) c
    WHERE NOT EXISTS (SELECT 1 FROM vocabulario WHERE palabra = w.palabra)
  `);
  if (!rows.length) return null;

  const fixes = new Map(rows.map((r) => [r.original, r.sugerida]));
  // Reemplaza en la consulta original para respetar el resto de lo escrito.
  return q.replace(/\p{L}+/gu, (word) => fixes.get(normalizeTag(word)) ?? word);
}

/**
 * Búsqueda de documentos (docs/02, "Consulta"). Siempre aplica la visibilidad del
 * usuario. `limit` crece con "Cargar más" (página × PAGE_SIZE).
 */
export async function searchDocuments(
  filters: SearchFilters,
  viewer: Viewer,
  limit = PAGE_SIZE,
  tx: Executor = db,
): Promise<SearchResponse> {
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

  let { total, results } = await fullTextSearch(q, joinAnd(base), limit, tx);
  let correccion: string | undefined;

  // Sin resultados: probar corrigiendo las palabras que no están en la biblioteca.
  if (total === 0) {
    const corregida = await correctQuery(q, viewer, tx);
    const r = corregida
      ? await fullTextSearch(corregida, joinAnd(base), limit, tx)
      : undefined;
    if (r && r.total > 0) {
      ({ total, results } = r);
      correccion = corregida!;
    }
  }

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

  return { total, results, correccion };
}

/** Registra la búsqueda (docs/03). Las sin resultados alimentan el panel del admin. */
export async function registrarBusqueda(input: {
  /** null = cliente final sin cuenta. */
  usuarioId: string | null;
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

/**
 * Últimas búsquedas con texto del usuario, sin repetir (sin distinguir acentos ni
 * mayúsculas), para volver a lanzarlas con un toque. Se omiten las que no dieron
 * resultados. Mira solo las 100 más recientes.
 */
export async function recentSearches(
  usuarioId: string,
  limit = 5,
  tx: Executor = db,
): Promise<string[]> {
  const rows = await tx.execute<{ texto: string }>(sql`
    SELECT texto FROM (
      SELECT DISTINCT ON (f_unaccent_lower(texto)) texto, creado_en
      FROM (
        SELECT texto, creado_en FROM busquedas
        WHERE usuario_id = ${usuarioId} AND texto IS NOT NULL
          AND cantidad_resultados > 0
        ORDER BY creado_en DESC
        LIMIT 100
      ) ultimas
      ORDER BY f_unaccent_lower(texto), creado_en DESC
    ) distintas
    ORDER BY creado_en DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => r.texto);
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
