/**
 * Punto de entrada al acceso a Google Drive: elige el cliente según la
 * configuración y valida que los ítems estén dentro de las carpetas raíz.
 *
 * @module
 */

import "server-only";
import { GoogleDriveClient } from "./google";
import { LocalDriveClient } from "./local";
import { PublicLinkDriveClient } from "./public";
import type { DriveClient, DriveItem } from "./types";

export * from "./types";

/**
 * Cliente elegido en la primera llamada a {@link getDrive} (uno por proceso).
 */
let client: DriveClient | undefined;

/**
 * Cliente de Drive según la configuración:
 *
 * - `DRIVE_LOCAL_DIR` → carpeta local que simula Drive (desarrollo y pruebas).
 * - Cuenta de servicio (`GOOGLE_SERVICE_ACCOUNT_*`) → API de Drive (diseño
 *   original).
 * - Si no, links públicos (la opción elegida: docs/02, "Google Drive").
 *   `DRIVE_PUBLIC_BASE_URL` solo para pruebas (servidor que imita a Google).
 *
 * @returns El cliente, creado una sola vez por proceso.
 */
export function getDrive(): DriveClient {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (process.env.DRIVE_LOCAL_DIR) {
    client = new LocalDriveClient(process.env.DRIVE_LOCAL_DIR);
  } else if (email && key) {
    const roots = (process.env.DRIVE_ROOT_FOLDER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    client = new GoogleDriveClient(email, key, roots);
  } else {
    // DRIVE_PUBLIC_BASE_URL solo para pruebas (servidor que imita a Google).
    client = new PublicLinkDriveClient(
      process.env.DRIVE_PUBLIC_BASE_URL || undefined,
    );
  }
  return client;
}

/**
 * Profundidad máxima de carpetas que recorre {@link pathFromRoot} (corta
 * ciclos).
 */
const MAX_DEPTH = 40;

/**
 * Camino desde una carpeta raíz permitida hasta `id` (inclusive). Así el admin
 * no puede recorrer ni incorporar nada fuera de `DRIVE_ROOT_FOLDER_IDS`
 * (docs/02).
 *
 * @param id - ID del archivo o carpeta.
 * @returns Los ítems desde la raíz hasta `id`, o `null` si no existe, está en
 *   la papelera o no está dentro de ninguna raíz.
 */
export async function pathFromRoot(id: string): Promise<DriveItem[] | null> {
  const drive = getDrive();
  const roots = new Set(await drive.rootIds());
  const chain: DriveItem[] = [];
  let currentId: string | undefined = id;

  for (let depth = 0; currentId && depth < MAX_DEPTH; depth++) {
    const item = await drive.getItem(currentId);
    if (!item || item.trashed) return null;
    chain.unshift(item);
    if (roots.has(item.id)) return chain;
    currentId = item.parents[0];
  }
  return null;
}
