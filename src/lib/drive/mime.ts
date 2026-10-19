/**
 * Tipos MIME: clasificación de archivos, cómo se sirven y qué se procesa.
 *
 * @module
 */

/** Tipo MIME de las carpetas de Drive. */
export const FOLDER_MIME = "application/vnd.google-apps.folder";

/** `true` para videos. */
export function isVideo(mime: string) {
  return mime.startsWith("video/");
}

/** `true` para imágenes. */
export function isImage(mime: string) {
  return mime.startsWith("image/");
}

/** `true` para PDF. */
export function isPdf(mime: string) {
  return mime === "application/pdf";
}

/** Google Docs, Sheets, Slides: no tienen bytes propios, se exportan. */
export function isGoogleNative(mime: string) {
  return (
    mime.startsWith("application/vnd.google-apps.") && mime !== FOLDER_MIME
  );
}

/**
 * Modo de acceso inicial (docs/02): videos → link público de Drive; todo lo
 * demás se sirve por el servidor.
 *
 * @param mime - Tipo del archivo.
 */
export function defaultModoAcceso(mime: string): "servidor" | "publico" {
  return isVideo(mime) ? "publico" : "servidor";
}

/**
 * Estado inicial de extracción (docs/02): PDFs y Google Docs se procesan;
 * videos e imágenes no tienen texto.
 *
 * @param mime - Tipo del archivo.
 */
export function initialEstadoExtraccion(
  mime: string,
): "pendiente" | "no_aplica" {
  return isPdf(mime) || isGoogleNative(mime) ? "pendiente" : "no_aplica";
}

/**
 * Tipos que el navegador muestra sin riesgo dentro de nuestro dominio. El resto
 * (HTML, SVG, etc.) se fuerza a descarga para que un archivo de Drive no pueda
 * ejecutar scripts con la sesión del usuario.
 */
const INLINE_SAFE = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
]);

/**
 * Si el archivo se puede mostrar `inline` (ver `INLINE_SAFE`).
 *
 * @param mime - Tipo del archivo.
 */
export function canDisplayInline(mime: string) {
  return INLINE_SAFE.has(mime);
}

/** Categoría para íconos y textos de la interfaz. */
export type FileKind = "pdf" | "video" | "imagen" | "documento" | "otro";

/**
 * Categoría de un archivo según su tipo.
 *
 * @param mime - Tipo del archivo.
 */
export function fileKind(mime: string): FileKind {
  if (isPdf(mime)) return "pdf";
  if (isVideo(mime)) return "video";
  if (isImage(mime)) return "imagen";
  if (
    isGoogleNative(mime) ||
    mime.includes("word") ||
    mime.includes("sheet") ||
    mime.includes("presentation")
  ) {
    return "documento";
  }
  return "otro";
}

/**
 * Tamaño legible en es-AR ("1,5 MB").
 *
 * @param bytes - Tamaño, o `null` (devuelve cadena vacía).
 */
export function formatBytes(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

/**
 * Nombre sin extensión ni guiones bajos, para el título inicial del borrador.
 *
 * @param name - Nombre del archivo.
 */
export function titleFromFileName(name: string) {
  const sinExtension = name.replace(/\.[a-z0-9]{1,5}$/i, "");
  return sinExtension.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || name;
}

/** Tipos por extensión, para cuando el servidor no informa el tipo. */
const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Tipo MIME por la extensión del nombre (cuando el servidor no lo informa
 * bien).
 *
 * @param name - Nombre del archivo.
 * @returns El tipo, o `application/octet-stream` si no se conoce la extensión.
 */
export function mimeFromName(name: string) {
  const ext = /\.[a-z0-9]{1,5}$/i.exec(name)?.[0].toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
