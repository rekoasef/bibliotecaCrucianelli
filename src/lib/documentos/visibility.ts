import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { documentos } from "@/db/schema";
import type { RolUsuario } from "@/db/schema";

/**
 * Quién mira: un usuario con sesión (su rol) o un cliente final sin cuenta
 * ("cliente": el acceso de clientes es libre, docs/01).
 */
export type RolLector = RolUsuario | "cliente";
export type Viewer = { rol: RolLector };

/** Lector sin sesión: cliente final. */
export const CLIENTE: Viewer = { rol: "cliente" };

/**
 * ÚNICA definición de qué documentos puede ver cada rol (CLAUDE.md, regla 2).
 * La usan la búsqueda, la navegación, la ficha y /api/archivos/[id]: no reescribir
 * estas condiciones en otras consultas.
 *
 * - admin: todo, incluidos borradores.
 * - fabrica: vigentes y obsoletos.
 * - concesionario: vigentes y obsoletos marcados para concesionarios.
 * - cliente: vigentes y obsoletos marcados para clientes.
 * - Fuera del admin, además, si el documento está asociado a máquinas, al menos una
 *   tiene que estar visible (modelo, línea y segmento activos): un documento asociado
 *   solo a máquinas desactivadas queda oculto (docs/02, "Reglas de visibilidad").
 *   Uno sin máquinas (por ejemplo, de Tecnología o Accesorios) no depende de esto.
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
      ) OR (
        NOT EXISTS (SELECT 1 FROM documento_lineas dl WHERE dl.documento_id = ${documentos.id})
        AND NOT EXISTS (SELECT 1 FROM documento_modelos dm WHERE dm.documento_id = ${documentos.id})
      )
    )`,
  ];
  if (viewer.rol === "concesionario") {
    conditions.push(eq(documentos.visibleConcesionarios, true));
  }
  if (viewer.rol === "cliente") {
    conditions.push(eq(documentos.visibleClientes, true));
  }
  return and(...conditions);
}
