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
 * Nombre del archivo desde Content-Disposition (filename* en UTF-8 o filename).
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
  return (plain?.[1] ?? plain?.[2])?.trim() || null;
}

/** Tamaño total desde Content-Range ("bytes 0-0/12345"). */
function totalFromContentRange(header: string | null) {
  const total = header ? /\/(\d+)$/.exec(header)?.[1] : undefined;
  return total ? Number(total) : null;
}

/**
 * Drive sin API (decisión de docs/02): descarga del lado del servidor archivos
 * compartidos como "Cualquier persona con el vínculo". No lista carpetas.
 * Un archivo privado, borrado o inexistente responde HTML: se trata como no accesible.
 */
export class PublicLinkDriveClient implements DriveClient {
  readonly browsable = false;

  constructor(private base = "https://drive.usercontent.google.com") {}

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

  private static isFile(res: Response) {
    const type = res.headers.get("content-type") ?? "";
    return (
      (res.status === 200 || res.status === 206) &&
      !type.startsWith("text/html")
    );
  }

  async rootIds() {
    return [];
  }

  async listChildren() {
    return [];
  }

  async exportText() {
    return null; // los Google Docs nativos no se aceptan con links públicos
  }

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
