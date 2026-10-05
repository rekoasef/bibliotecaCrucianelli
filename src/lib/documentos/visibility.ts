import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { documentos } from "@/db/schema";
import type { RolUsuario } from "@/db/schema";

export type Viewer = { rol: RolUsuario };

/**
 * ÚNICA definición de qué documentos puede ver cada rol (CLAUDE.md, regla 2).
 * La usan la búsqueda, la navegación, la ficha y /api/archivos/[id]: no reescribir
 * estas condiciones en otras consultas.
 *
 * - admin: todo, incluidos borradores.
 * - fabrica: vigentes y obsoletos.
 * - concesionario: vigentes y obsoletos con visibilidad "concesionarios".
 * - Fuera del admin, además, el documento tiene que estar asociado al menos a una
 *   máquina visible (modelo, línea y segmento activos): un documento asociado solo a
 *   máquinas desactivadas queda oculto (docs/02, "Reglas de visibilidad").
 *
 * Devuelve `undefined` para el admin (sin restricción), listo para `.where(...)`.
 */
export function documentVisibilityFilter(viewer: Viewer): SQL | undefined {
  if (viewer.rol === "admin") return undefined;

  const conditions: SQL[] = [
    inArray(documentos.estado, ["vigente", "obsoleto"]),
    sql`(
      EXISTS (
        SELECT 1 FROM documento_lineas dl
        JOIN lineas l ON l.id = dl.linea_id
        JOIN segmentos s ON s.id = l.segmento_id
        WHERE dl.documento_id = ${documentos.id} AND l.activo AND s.activo
      ) OR EXISTS (
        SELECT 1 FROM documento_modelos dm
        JOIN modelos m ON m.id = dm.modelo_id
        JOIN lineas l ON l.id = m.linea_id
        JOIN segmentos s ON s.id = l.segmento_id
        WHERE dm.documento_id = ${documentos.id} AND m.activo AND l.activo AND s.activo
      )
    )`,
  ];
  if (viewer.rol === "concesionario") {
    conditions.push(eq(documentos.visibilidad, "concesionarios"));
  }
  return and(...conditions);
}
