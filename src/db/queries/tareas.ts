/**
 * Consultas de tareas periódicas.
 *
 * @module
 */

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tareas } from "@/db/schema";

/**
 * Última ejecución de una tarea.
 *
 * @param nombre - Nombre de la tarea (por ejemplo `SYNC_TASK`).
 * @returns La fila, o `null` si nunca corrió.
 */
export async function getTarea(nombre: string) {
  const [row] = await db.select().from(tareas).where(eq(tareas.nombre, nombre));
  return row ?? null;
}
