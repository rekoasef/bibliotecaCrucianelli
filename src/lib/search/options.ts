import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  documentos,
  etiquetas,
  lineas,
  modelos,
  segmentos,
  sistemas,
  temas,
  tipos,
} from "@/db/schema";
import {
  documentVisibilityFilter,
  type Viewer,
} from "@/lib/documentos/visibility";

export type Opcion = { nombre: string; slug: string };
export type MaquinaOpcion = {
  segmento: string;
  lineas: (Opcion & { id: string; modelos: Opcion[] })[];
};

/** Opciones de los filtros de búsqueda: solo lo activo (el admin ve todo). */
export const getSearchOptions = cache(async (viewer: Viewer) => {
  const soloActivos = viewer.rol !== "admin";
  const catalogo = (t: typeof tipos | typeof sistemas | typeof temas) =>
    db
      .select({ nombre: t.nombre, slug: t.slug })
      .from(t)
      .where(soloActivos ? eq(t.activo, true) : undefined)
      .orderBy(asc(t.orden), asc(t.nombre));

  const [segs, lins, mods, tiposOps, sistemasOps, temasOps, etiquetasOps] =
    await Promise.all([
      db
        .select()
        .from(segmentos)
        .where(soloActivos ? eq(segmentos.activo, true) : undefined)
        .orderBy(asc(segmentos.orden)),
      db
        .select()
        .from(lineas)
        .where(soloActivos ? eq(lineas.activo, true) : undefined)
        .orderBy(asc(lineas.orden), asc(lineas.nombre)),
      db
        .select()
        .from(modelos)
        .where(soloActivos ? eq(modelos.activo, true) : undefined)
        .orderBy(asc(modelos.orden), asc(modelos.nombre)),
      catalogo(tipos),
      catalogo(sistemas),
      catalogo(temas),
      // Solo etiquetas de documentos que el usuario puede ver.
      db
        .selectDistinct({
          nombre: etiquetas.nombre,
          slug: etiquetas.nombreNormalizado,
        })
        .from(etiquetas)
        .innerJoin(
          sql`documento_etiquetas de`,
          sql`de.etiqueta_id = ${etiquetas.id}`,
        )
        .innerJoin(documentos, sql`${documentos.id} = de.documento_id`)
        .where(and(documentVisibilityFilter(viewer)))
        .orderBy(asc(etiquetas.nombreNormalizado)),
    ]);

  const maquinas: MaquinaOpcion[] = segs
    .map((s) => ({
      segmento: s.nombre,
      lineas: lins
        .filter((l) => l.segmentoId === s.id)
        .map((l) => ({
          id: l.id,
          nombre: l.nombre,
          slug: l.slug,
          modelos: mods
            .filter((m) => m.lineaId === l.id)
            .map((m) => ({ nombre: m.nombre, slug: m.slug })),
        })),
    }))
    .filter((s) => s.lineas.length > 0);

  return {
    maquinas,
    tipos: tiposOps,
    sistemas: sistemasOps,
    temas: temasOps,
    etiquetas: etiquetasOps,
  };
});

export type SearchOptions = Awaited<ReturnType<typeof getSearchOptions>>;
