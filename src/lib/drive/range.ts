/**
 * Interpreta una cabecera Range de un solo rango ("bytes=0-499", "bytes=500-",
 * "bytes=-500"). Devuelve null si no hay rango utilizable (se responde el archivo
 * completo) y "invalid" si el rango no se puede satisfacer (416).
 */
export function parseRange(header: string | null | undefined, size: number) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null; // varios rangos u otra unidad: se ignora y va completo
  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return null;

  let start: number;
  let end: number;
  if (!startStr) {
    // sufijo: los últimos N bytes
    const suffix = Number(endStr);
    if (suffix === 0) return "invalid" as const;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr ? Math.min(Number(endStr), size - 1) : size - 1;
  }
  if (start >= size || start > end) return "invalid" as const;
  return { start, end };
}
