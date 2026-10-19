/**
 * Normalización de texto: etiquetas, slugs y patrones de búsqueda.
 *
 * @module
 */

/** Quita acentos y diacríticos ("Boletín" → "Boletin"). */
function stripAccents(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Forma canónica de una etiqueta: minúsculas, sin acentos, espacios simples.
 * Coincide con `f_unaccent_lower` de la base.
 *
 * @param text - Texto a normalizar.
 */
export function normalizeTag(text: string) {
  return stripAccents(text).toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Slug para URLs: "Gringa V" → "gringa-v", "Boletín técnico" →
 * "boletin-tecnico".
 *
 * @param text - Nombre a convertir.
 */
export function slugify(text: string) {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Patrón de `ILIKE` que contiene `text` literal: escapa `%`, `_` y `\` para que
 * lo que escribe el usuario no funcione como comodín.
 *
 * @param text - Texto buscado.
 * @returns `%texto%` escapado.
 */
export function containsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
