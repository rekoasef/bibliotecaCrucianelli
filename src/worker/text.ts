/** Tope de texto guardado por archivo (docs/02: ~1 MB para no inflar el índice). */
export const MAX_TEXT_CHARS = 1_000_000;

/**
 * Limpia el texto extraído: Postgres no acepta \0 en `text`, y pdftotext deja saltos
 * de página (\f) y espacios de sobra.
 */
export function cleanText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/**
 * Un PDF escaneado casi no tiene texto: si hay menos de ~80 caracteres útiles por
 * página, se pasa a OCR (docs/02).
 */
export function needsOcr(text: string, pages: number) {
  const useful = text.replace(/\s+/g, "").length;
  return useful < 80 * Math.max(pages, 1);
}
