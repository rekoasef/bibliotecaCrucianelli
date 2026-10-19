/**
 * Marcadores del fragmento resaltado de la búsqueda.
 *
 * @module
 */

/**
 * Inicio de una coincidencia. Son caracteres de control (no HTML): el cliente
 * los convierte en `<mark>`, así el texto de los documentos nunca se interpreta
 * como HTML.
 */
export const MARK_START = "\u0001";

/** Fin de una coincidencia. */
export const MARK_END = "\u0002";
