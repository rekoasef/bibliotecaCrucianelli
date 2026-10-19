/**
 * Cabecera `Content-Disposition` para descargas.
 *
 * @module
 */

/**
 * `Content-Disposition` con nombre UTF-8 (RFC 6266, `filename*`) y un fallback
 * ASCII (`filename`).
 *
 * @param type - `inline` (ver en el navegador) o `attachment` (descargar).
 * @param filename - Nombre del archivo, con acentos o cualquier carácter.
 * @returns El valor de la cabecera.
 */
export function contentDisposition(
  type: "inline" | "attachment",
  filename: string,
) {
  const ascii = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
