/** Tope de texto guardado por archivo (docs/02: ~1 MB para no inflar el índice). */
export const MAX_TEXT_CHARS = 1_000_000;

/**
 * Limpia el texto extraído: Postgres no acepta \0 en `text`, y pdftotext deja
 * espacios de sobra. Los saltos de página (\f) se conservan: separan las páginas
 * para `rebuild_archivo_paginas` (migración 0010), así que tampoco se recortan al
 * principio (una primera página vacía correría la numeración).
 */
export function cleanText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \n]*\f[ \n]*/g, "\f")
    .replace(/^[ \n]+/, "")
    .replace(/\s+$/, "")
    .slice(0, MAX_TEXT_CHARS);
}

/**
 * Junta el texto de pdftotext con el del OCR página por página (separadas con \f),
 * para que cada página conserve su número.
 */
export function mergePages(pdftotext: string, ocrPages: string[]) {
  const pages = pdftotext.split("\f");
  const total = Math.max(pages.length, ocrPages.length);
  return Array.from({ length: total }, (_, i) =>
    [pages[i], ocrPages[i]].filter((t) => t?.trim()).join("\n"),
  ).join("\f");
}

/**
 * Un PDF escaneado casi no tiene texto: si hay menos de ~80 caracteres útiles por
 * página, se pasa a OCR (docs/02).
 */
export function needsOcr(text: string, pages: number) {
  const useful = text.replace(/\s+/g, "").length;
  return useful < 80 * Math.max(pages, 1);
}
