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

export type DriveDownload = {
  /** 200 o 206 (si se pidió un rango) */
  status: number;
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  contentRange: string | null;
};

export interface DriveClient {
  /** Metadatos de un archivo o carpeta; null si no existe o no hay acceso. */
  getItem(id: string): Promise<DriveItem | null>;
  /** Contenido de una carpeta (sin papelera): carpetas primero, después por nombre. */
  listChildren(folderId: string): Promise<DriveItem[]>;
  /** Descarga en streaming. `range` es la cabecera HTTP Range tal cual vino. */
  download(
    id: string,
    options?: { range?: string | null },
  ): Promise<DriveDownload>;
  /** IDs de las carpetas raíz permitidas (DRIVE_ROOT_FOLDER_IDS). */
  rootIds(): Promise<string[]>;
}

export class DriveNotFoundError extends Error {}
export class DriveRangeError extends Error {}
