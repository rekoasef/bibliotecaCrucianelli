/**
 * Cliente de Drive con links públicos ("Cualquier persona con el vínculo"), sin
 * Google Cloud: la opción elegida en docs/02.
 *
 * @module
 */

import "server-only";
import { mimeFromName } from "./mime";
import {
  DriveNotFoundError,
  DriveRangeError,
  type DriveClient,
  type DriveDownload,
  type DriveItem,
} from "./types";

/**
 * Nombre del archivo desde `Content-Disposition` (`filename*` en UTF-8 o
 * `filename`).
 *
 * @param header - Valor de la cabecera, o `null`.
 * @returns El nombre, o `null` si la cabecera no lo trae.
 */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // sigue con filename=
    }
  }
  const plain = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(header);
  const name = (plain?.[1] ?? plain?.[2])?.trim();
  return name ? fixLatin1Mojibake(name) : null;
}

/**
 * Google manda el nombre en UTF-8 dentro de `filename="…"` y `fetch` lo lee
 * como Latin-1 ("INSTALACIÃ\u0093N"). Si al reinterpretarlo da UTF-8 válido, se
 * corrige.
 *
 * @param text - Nombre leído de la cabecera.
 * @returns El nombre corregido, o el original si no era mojibake.
 */
function fixLatin1Mojibake(text: string) {
  if (!/[\u0080-\u00ff]/.test(text) || /[^\u0000-\u00ff]/.test(text))
    return text;
  const decoded = Buffer.from(text, "latin1").toString("utf8");
  return decoded.includes("\ufffd") ? text : decoded;
}

/**
 * Tamaño total desde `Content-Range` ("bytes 0-0/12345").
 *
 * @param header - Valor de la cabecera, o `null`.
 * @returns El total en bytes, o `null`.
 */
function totalFromContentRange(header: string | null) {
  const total = header ? /\/(\d+)$/.exec(header)?.[1] : undefined;
  return total ? Number(total) : null;
}

/**
 * Drive sin API (decisión de docs/02): descarga del lado del servidor archivos
 * compartidos como "Cualquier persona con el vínculo". No lista carpetas
 * (`browsable = false`).
 *
 * @remarks Un archivo privado, borrado o inexistente responde HTML: se trata
 *   como no accesible.
 */
export class PublicLinkDriveClient implements DriveClient {
  readonly browsable = false;

  /**
   * @param base - Servidor de descargas de Google; en pruebas, uno falso.
   */
  constructor(private base = "https://drive.usercontent.google.com") {}

  /**
   * Pide el archivo a la URL de descarga directa (`confirm=t` saltea el aviso
   * de antivirus de archivos grandes).
   *
   * @param id - ID del archivo en Drive.
   * @param range - Cabecera `Range` a reenviar.
   */
  private request(id: string, range?: string | null) {
    const params = new URLSearchParams({
      id,
      export: "download",
      confirm: "t",
    });
    return fetch(`${this.base}/download?${params}`, {
      headers: range ? { Range: range } : {},
      redirect: "follow",
      cache: "no-store",
    });
  }

  /**
   * `true` si la respuesta es el archivo (y no una página HTML de error o de
   * login).
   */
  private static isFile(res: Response) {
    const type = res.headers.get("content-type") ?? "";
    return (
      (res.status === 200 || res.status === 206) &&
      !type.startsWith("text/html")
    );
  }

  /** Sin explorador no hay carpetas raíz. */
  async rootIds() {
    return [];
  }

  /** Sin explorador no se listan carpetas. */
  async listChildren() {
    return [];
  }

  /** Los Google Docs nativos no se aceptan con links públicos. */
  async exportText() {
    return null; // los Google Docs nativos no se aceptan con links públicos
  }

  /**
   * Metadatos del archivo leídos de las cabeceras de una descarga de 1 byte.
   *
   * @param id - ID del archivo en Drive.
   * @returns El ítem, o `null` si no se puede abrir con el link.
   */
  async getItem(id: string): Promise<DriveItem | null> {
    // Pide 1 byte: alcanza para leer nombre, tipo y tamaño de las cabeceras.
    const res = await this.request(id, "bytes=0-0").catch(() => null);
    if (!res) return null;
    // Se lee el cuerpo (1 byte o una página de error chica) en vez de cancelarlo:
    // dentro de Next, cancelar un stream de fetch puede quedar esperando.
    await res.arrayBuffer().catch(() => undefined);
    if (!PublicLinkDriveClient.isFile(res)) return null;

    const name =
      filenameFromDisposition(res.headers.get("content-disposition")) ?? id;
    const headerType = res.headers.get("content-type")?.split(";")[0].trim();
    const mimeType =
      !headerType || headerType === "application/octet-stream"
        ? mimeFromName(name)
        : headerType;
    const size =
      res.status === 206
        ? totalFromContentRange(res.headers.get("content-range"))
        : Number(res.headers.get("content-length")) || null;
    const lastModified = res.headers.get("last-modified");

    return {
      id,
      name,
      mimeType,
      isFolder: false,
      size,
      modifiedTime: lastModified ? new Date(lastModified) : null,
      parents: [],
      trashed: false,
    };
  }

  /**
   * Descarga en streaming, con soporte de rangos.
   *
   * @param id - ID del archivo en Drive.
   * @param options - `range`: cabecera `Range` tal cual vino del navegador.
   * @throws Lanza {@link DriveRangeError} si el rango no se puede satisfacer.
   * @throws Lanza {@link DriveNotFoundError} si el archivo no es accesible.
   */
  async download(
    id: string,
    options: { range?: string | null } = {},
  ): Promise<DriveDownload> {
    const res = await this.request(id, options.range);
    if (res.status === 416) {
      await res.arrayBuffer().catch(() => undefined);
      throw new DriveRangeError(id);
    }
    if (!PublicLinkDriveClient.isFile(res) || !res.body) {
      await res.arrayBuffer().catch(() => undefined);
      throw new DriveNotFoundError(id);
    }
    const length = res.headers.get("content-length");
    const name =
      filenameFromDisposition(res.headers.get("content-disposition")) ?? "";
    const headerType = res.headers.get("content-type")?.split(";")[0].trim();
    return {
      status: res.status,
      body: res.body,
      contentType:
        !headerType || headerType === "application/octet-stream"
          ? mimeFromName(name)
          : headerType,
      contentLength: length ? Number(length) : null,
      contentRange: res.headers.get("content-range"),
    };
  }
}
