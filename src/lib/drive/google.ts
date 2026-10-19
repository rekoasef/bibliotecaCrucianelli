/**
 * Cliente de Drive con cuenta de servicio (API de Drive v3, solo lectura): el
 * diseño original de docs/02.
 *
 * Sigue disponible si se configuran `GOOGLE_SERVICE_ACCOUNT_*`; por defecto la
 * app usa links públicos (`public.ts`).
 *
 * @module
 */

import "server-only";
import { JWT } from "google-auth-library";
import { FOLDER_MIME, isGoogleNative } from "./mime";
import {
  DriveNotFoundError,
  DriveRangeError,
  type DriveClient,
  type DriveDownload,
  type DriveItem,
} from "./types";

/** Base de la API de Drive v3. */
const API = "https://www.googleapis.com/drive/v3";

/** Campos que se piden de cada archivo. */
const FIELDS = "id,name,mimeType,size,modifiedTime,parents,trashed";

/** Parámetro para que funcione también con unidades compartidas (docs/02). */
const SHARED = "supportsAllDrives=true";

/** Google Docs nativos que se exportan a PDF (no tienen bytes propios). */
const EXPORT_AS_PDF = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.drawing",
]);

/** Archivo tal como lo devuelve la API. */
type RawFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  trashed?: boolean;
};

/** Convierte un archivo de la API en {@link DriveItem}. */
function toItem(f: RawFile): DriveItem {
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    isFolder: f.mimeType === FOLDER_MIME,
    size: f.size ? Number(f.size) : null,
    modifiedTime: f.modifiedTime ? new Date(f.modifiedTime) : null,
    parents: f.parents ?? [],
    trashed: Boolean(f.trashed),
  };
}

/** Cliente de Drive con cuenta de servicio y acceso de solo lectura. */
export class GoogleDriveClient implements DriveClient {
  readonly browsable = true;
  private auth: JWT;

  /**
   * @param email - Email de la cuenta de servicio.
   * @param privateKey - Clave privada (en `.env` suele venir con `\n`
   *   escapados).
   * @param roots - IDs de las carpetas raíz permitidas.
   */
  constructor(
    email: string,
    privateKey: string,
    private roots: string[],
  ) {
    this.auth = new JWT({
      email,
      // En .env la clave suele venir con "\n" escapados.
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
  }

  /** GET autenticado a la API, sin caché. */
  private async request(path: string, headers: Record<string, string> = {}) {
    const { token } = await this.auth.getAccessToken();
    return fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}`, ...headers },
      cache: "no-store",
    });
  }

  /** Las carpetas de `DRIVE_ROOT_FOLDER_IDS`. */
  async rootIds() {
    return this.roots;
  }

  /**
   * Metadatos de un archivo o carpeta.
   *
   * @returns El ítem, o `null` si no existe o la cuenta no tiene acceso.
   * @throws Error ante otras respuestas de la API.
   */
  async getItem(id: string) {
    const res = await this.request(
      `/files/${encodeURIComponent(id)}?fields=${FIELDS}&${SHARED}`,
    );
    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok)
      throw new Error(`Drive files.get ${res.status}: ${await res.text()}`);
    return toItem((await res.json()) as RawFile);
  }

  /** Contenido de una carpeta (sin papelera), paginando hasta el final. */
  async listChildren(folderId: string) {
    const items: DriveItem[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
        fields: `nextPageToken,files(${FIELDS})`,
        orderBy: "folder,name_natural",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await this.request(`/files?${params}`);
      if (!res.ok)
        throw new Error(`Drive files.list ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        files: RawFile[];
        nextPageToken?: string;
      };
      items.push(...data.files.map(toItem));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return items;
  }

  /**
   * Texto plano de un Google Doc nativo, para la extracción.
   *
   * @returns El texto, o `null` si el tipo no se exporta como texto.
   * @throws Lanza {@link DriveNotFoundError} si no existe o no hay acceso.
   */
  async exportText(id: string) {
    const res = await this.request(
      `/files/${encodeURIComponent(id)}/export?mimeType=text/plain`,
    );
    if (res.status === 404 || res.status === 403)
      throw new DriveNotFoundError(id);
    if (res.status === 400) return null; // tipo que no se exporta como texto
    if (!res.ok) throw new Error(`Drive export ${res.status}`);
    return res.text();
  }

  /**
   * Descarga en streaming. Los Google Docs nativos se exportan a PDF (sin
   * rangos).
   *
   * @throws Lanza {@link DriveNotFoundError} si no existe o no hay acceso.
   * @throws Lanza {@link DriveRangeError} si el rango no se puede satisfacer.
   */
  async download(
    id: string,
    options: { range?: string | null } = {},
  ): Promise<DriveDownload> {
    const item = await this.getItem(id);
    if (!item) throw new DriveNotFoundError(id);

    if (isGoogleNative(item.mimeType)) {
      if (!EXPORT_AS_PDF.has(item.mimeType)) throw new DriveNotFoundError(id);
      const res = await this.request(
        `/files/${encodeURIComponent(id)}/export?mimeType=application/pdf`,
      );
      if (!res.ok || !res.body) throw new Error(`Drive export ${res.status}`);
      return {
        status: 200,
        body: res.body,
        contentType: "application/pdf",
        contentLength: null,
        contentRange: null,
      };
    }

    const res = await this.request(
      `/files/${encodeURIComponent(id)}?alt=media&${SHARED}`,
      options.range ? { Range: options.range } : {},
    );
    if (res.status === 404 || res.status === 403)
      throw new DriveNotFoundError(id);
    if (res.status === 416) throw new DriveRangeError(id);
    if (!res.ok || !res.body) throw new Error(`Drive alt=media ${res.status}`);
    const length = res.headers.get("content-length");
    return {
      status: res.status,
      body: res.body,
      contentType: item.mimeType,
      contentLength: length ? Number(length) : null,
      contentRange: res.headers.get("content-range"),
    };
  }
}
