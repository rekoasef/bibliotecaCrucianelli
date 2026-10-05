import "server-only";
import { GoogleDriveClient } from "./google";
import { LocalDriveClient } from "./local";
import type { DriveClient, DriveItem } from "./types";

export * from "./types";

let client: DriveClient | undefined;

/**
 * Cliente de Drive según la configuración:
 * - Cuenta de servicio (GOOGLE_SERVICE_ACCOUNT_*) → Drive real.
 * - DRIVE_LOCAL_DIR → carpeta local que simula Drive (solo desarrollo y pruebas).
 */
export function getDrive(): DriveClient {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (email && key) {
    const roots = (process.env.DRIVE_ROOT_FOLDER_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    client = new GoogleDriveClient(email, key, roots);
  } else if (process.env.DRIVE_LOCAL_DIR) {
    client = new LocalDriveClient(process.env.DRIVE_LOCAL_DIR);
  } else {
    throw new Error(
      "Drive no está configurado: completá GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (o DRIVE_LOCAL_DIR para desarrollo).",
    );
  }
  return client;
}

export function isDriveConfigured() {
  return Boolean(
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) ||
    process.env.DRIVE_LOCAL_DIR,
  );
}

const MAX_DEPTH = 40;

/**
 * Camino desde una carpeta raíz permitida hasta `id` (inclusive), o null si el
 * ítem no está dentro de ninguna raíz. Así el admin no puede recorrer ni incorporar
 * nada fuera de DRIVE_ROOT_FOLDER_IDS (docs/02).
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
