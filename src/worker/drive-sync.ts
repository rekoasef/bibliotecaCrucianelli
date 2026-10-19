/**
 * Detección de cambios en Drive (docs/02): corre cada noche en el worker o a
 * mano con `npm run sync:drive`.
 *
 * @module
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { archivos, documentos, tareas } from "@/db/schema";
import { getDrive, type DriveItem } from "@/lib/drive";
import { initialEstadoExtraccion } from "@/lib/drive/mime";

import { SYNC_TASK } from "@/lib/tareas";

export { SYNC_TASK };

/** Archivos consultados en paralelo. */
const CONCURRENCY = 5;

/** Resumen de una corrida (se guarda en `tareas.resultado`). */
export type SyncResult = {
  revisados: number;
  cambiados: number;
  noDisponibles: number;
  recuperados: number;
  errores: number;
};

/** Datos de un archivo incorporado que se comparan con Drive. */
type ArchivoSync = {
  id: string;
  documentoId: string;
  driveFileId: string;
  driveModificadoEn: Date | null;
  tamanoBytes: number | null;
  disponible: boolean;
};

/**
 * Qué hacer con un archivo según lo que devuelve Drive (puro, para testear).
 * Con links públicos no siempre hay fecha de modificación: un tamaño distinto
 * también cuenta como cambio.
 *
 * @param archivo - Lo guardado en la base.
 * @param item - Lo que devuelve Drive, o `null` si no es accesible.
 * @returns `no-disponible`, `recuperado`, `cambiado` o `igual`.
 */
export function decideSync(
  archivo: Pick<
    ArchivoSync,
    "driveModificadoEn" | "disponible" | "tamanoBytes"
  >,
  item: Pick<DriveItem, "modifiedTime" | "trashed" | "size"> | null,
): "no-disponible" | "recuperado" | "cambiado" | "igual" {
  if (!item || item.trashed)
    return archivo.disponible ? "no-disponible" : "igual";
  if (!archivo.disponible) return "recuperado";
  if (
    item.modifiedTime &&
    (!archivo.driveModificadoEn ||
      item.modifiedTime.getTime() > archivo.driveModificadoEn.getTime())
  ) {
    return "cambiado";
  }
  // Con links públicos no siempre hay fecha de modificación: un tamaño distinto
  // también indica que el archivo cambió.
  if (
    item.size != null &&
    archivo.tamanoBytes != null &&
    item.size !== archivo.tamanoBytes
  ) {
    return "cambiado";
  }
  return "igual";
}

/**
 * Detección de cambios (docs/02): consulta cada archivo incorporado en Drive.
 *
 * - Cambió: actualiza metadatos, vuelve a extraer el texto y marca el documento
 *   para revisión.
 * - Borrado o sin acceso: lo marca no disponible (aviso en el panel).
 * - Volvió a estar accesible: lo marca disponible.
 *
 * Nunca incorpora archivos nuevos. Un error de red en un archivo no frena el
 * resto ni lo marca como borrado. Guarda el resumen en `tareas`.
 *
 * @returns El resumen de la corrida.
 */
export async function syncDriveChanges(): Promise<SyncResult> {
  const drive = getDrive();
  const lista: ArchivoSync[] = await db
    .select({
      id: archivos.id,
      documentoId: archivos.documentoId,
      driveFileId: archivos.driveFileId,
      driveModificadoEn: archivos.driveModificadoEn,
      tamanoBytes: archivos.tamanoBytes,
      disponible: archivos.disponible,
    })
    .from(archivos);

  const result: SyncResult = {
    revisados: 0,
    cambiados: 0,
    noDisponibles: 0,
    recuperados: 0,
    errores: 0,
  };

  async function revisar(a: ArchivoSync) {
    try {
      const item = await drive.getItem(a.driveFileId);
      const decision = decideSync(a, item);
      result.revisados++;
      if (decision === "no-disponible") {
        await db
          .update(archivos)
          .set({ disponible: false })
          .where(eq(archivos.id, a.id));
        result.noDisponibles++;
      } else if (decision === "recuperado") {
        await db
          .update(archivos)
          .set({ disponible: true })
          .where(eq(archivos.id, a.id));
        result.recuperados++;
      } else if (decision === "cambiado" && item) {
        await db.transaction(async (tx) => {
          await tx
            .update(archivos)
            .set({
              nombre: item.name,
              mimeType: item.mimeType,
              tamanoBytes: item.size,
              driveModificadoEn: item.modifiedTime,
              estadoExtraccion: initialEstadoExtraccion(item.mimeType),
              extraccionError: null,
            })
            .where(eq(archivos.id, a.id));
          await tx
            .update(documentos)
            .set({ requiereRevision: true })
            .where(eq(documentos.id, a.documentoId));
        });
        result.cambiados++;
      }
    } catch (error) {
      // Un error de red no debe frenar el resto ni marcar el archivo como borrado.
      result.errores++;
      console.error(
        `Sync de ${a.id} falló:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  for (let i = 0; i < lista.length; i += CONCURRENCY) {
    await Promise.all(lista.slice(i, i + CONCURRENCY).map(revisar));
  }

  await db
    .insert(tareas)
    .values({
      nombre: SYNC_TASK,
      ultimaEjecucion: new Date(),
      resultado: result,
    })
    .onConflictDoUpdate({
      target: tareas.nombre,
      set: { ultimaEjecucion: new Date(), resultado: result },
    });
  return result;
}

/** Fecha `YYYY-MM-DD` en hora de Argentina. */
const AR_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
});

/** Hora (0–23) en hora de Argentina. */
const AR_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "numeric",
  hourCycle: "h23",
});

/**
 * Si toca correr la tarea nocturna: a partir de `hour`, una vez por día, en
 * hora de Argentina.
 *
 * @param now - Momento actual.
 * @param lastRun - Última corrida, o `null`.
 * @param hour - Hora desde la que corre.
 */
export function shouldRunNightly(
  now: Date,
  lastRun: Date | null,
  hour: number,
) {
  if (Number(AR_HOUR.format(now)) < hour) return false;
  return !lastRun || AR_DATE.format(lastRun) !== AR_DATE.format(now);
}

/** Última corrida de la detección de cambios, o `null`. */
export async function lastSyncRun() {
  const [row] = await db
    .select()
    .from(tareas)
    .where(eq(tareas.nombre, SYNC_TASK));
  return row ?? null;
}
