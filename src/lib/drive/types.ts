/**
 * Tipos comunes a los clientes de Drive (links públicos, cuenta de servicio,
 * carpeta local).
 *
 * @module
 */

/** Archivo o carpeta de Drive, normalizado. */
export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  /** null para Google Docs nativos y carpetas */
  size: number | null;
  modifiedTime: Date | null;
  parents: string[];
  trashed: boolean;
};

/** Descarga en streaming, lista para reenviar como respuesta HTTP. */
export type DriveDownload = {
  /** 200 o 206 (si se pidió un rango) */
  status: number;
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  contentRange: string | null;
};

/**
 * Operaciones de Drive que usan la app y el worker. Ver `getDrive` para cómo se
 * elige la implementación.
 */
export interface DriveClient {
  /**
   * true si se pueden recorrer carpetas (cuenta de servicio, carpeta local).
   * Con links públicos no: se incorporan archivos pegando su link.
   */
  readonly browsable: boolean;
  /** Metadatos de un archivo o carpeta; null si no existe o no hay acceso. */
  getItem(id: string): Promise<DriveItem | null>;
  /** Contenido de una carpeta (sin papelera): carpetas primero, después por nombre. */
  listChildren(folderId: string): Promise<DriveItem[]>;
  /** Descarga en streaming. `range` es la cabecera HTTP Range tal cual vino. */
  download(
    id: string,
    options?: { range?: string | null },
  ): Promise<DriveDownload>;
  /** Texto plano de un Google Doc nativo (para la extracción); null si no aplica. */
  exportText(id: string): Promise<string | null>;
  /** IDs de las carpetas raíz permitidas (DRIVE_ROOT_FOLDER_IDS). */
  rootIds(): Promise<string[]>;
}

/** El archivo no existe, se borró o no es accesible. */
export class DriveNotFoundError extends Error {}

/** El rango pedido no se puede satisfacer (HTTP 416). */
export class DriveRangeError extends Error {}
