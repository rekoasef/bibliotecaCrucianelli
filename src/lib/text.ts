function stripAccents(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Forma canónica de una etiqueta: minúsculas, sin acentos, espacios simples. */
export function normalizeTag(text: string) {
  return stripAccents(text).toLowerCase().trim().replace(/\s+/g, " ");
}

/** Slug para URLs: "Gringa V" → "gringa-v", "Boletín técnico" → "boletin-tecnico". */
export function slugify(text: string) {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
