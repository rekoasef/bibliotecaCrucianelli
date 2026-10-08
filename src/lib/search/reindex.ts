import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

type Executor = Pick<typeof db, "execute">;

/** Recalcula `documentos.busqueda` (función SQL en la migración 0005). */
export async function rebuildDocumentSearch(
  documentoId: string,
  tx: Executor = db,
) {
  await tx.execute(sql`SELECT rebuild_document_search(${documentoId})`);
}

export type TaxonomiaKind =
  | "lineas"
  | "modelos"
  | "tipos"
  | "sistemas"
  | "temas"
  | "productos"
  | "etiquetas";

/**
 * Al renombrar una entrada de taxonomía, recalcula los documentos que la usan
 * (docs/02). Línea y modelo se indexan cruzados: renombrar una línea afecta a los
 * documentos de sus modelos y viceversa.
 */
export async function rebuildSearchForTaxonomia(
  kind: TaxonomiaKind,
  id: string,
) {
  const afectados = {
    lineas: sql`
      SELECT documento_id FROM documento_lineas WHERE linea_id = ${id}
      UNION SELECT dm.documento_id FROM documento_modelos dm
        JOIN modelos m ON m.id = dm.modelo_id WHERE m.linea_id = ${id}`,
    modelos: sql`
      SELECT documento_id FROM documento_modelos WHERE modelo_id = ${id}
      UNION SELECT dl.documento_id FROM documento_lineas dl
        JOIN modelos m ON m.linea_id = dl.linea_id WHERE m.id = ${id}`,
    tipos: sql`SELECT id FROM documentos WHERE tipo_id = ${id}`,
    sistemas: sql`SELECT documento_id FROM documento_sistemas WHERE sistema_id = ${id}`,
    temas: sql`SELECT documento_id FROM documento_temas WHERE tema_id = ${id}`,
    productos: sql`SELECT documento_id FROM documento_productos WHERE producto_id = ${id}`,
    etiquetas: sql`SELECT documento_id FROM documento_etiquetas WHERE etiqueta_id = ${id}`,
  }[kind];

  await db.execute(
    sql`SELECT rebuild_document_search(doc) FROM (${afectados}) AS a(doc)`,
  );
}
