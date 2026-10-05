export type DriveLink = { kind: "file" | "folder" | "native"; id: string };

// Los IDs de Drive tienen entre 25 y 44 caracteres; 20 deja margen sin confundir palabras.
const ID = "[A-Za-z0-9_-]{20,}";

/**
 * Saca el ID de un link de Drive (o acepta el ID solo). Formatos:
 * drive.google.com/file/d/ID/…, …/open?id=ID, …/uc?id=ID, …/drive/folders/ID,
 * docs.google.com/{document,spreadsheets,presentation,drawings}/d/ID/…
 * Devuelve null si no se reconoce.
 */
export function parseDriveLink(input: string): DriveLink | null {
  const text = input.trim();
  if (!text) return null;
  if (new RegExp(`^${ID}$`).test(text)) return { kind: "file", id: text };

  let url: URL;
  try {
    url = new URL(text.startsWith("http") ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!/(^|\.)(drive|docs)\.google\.com$/.test(url.hostname)) return null;

  const folder = new RegExp(`/folders/(${ID})`).exec(url.pathname);
  if (folder) return { kind: "folder", id: folder[1] };

  // Google Docs, Sheets, Slides: no tienen un archivo para descargar.
  const native = new RegExp(
    `^/(document|spreadsheets|presentation|drawings)/d/(${ID})`,
  ).exec(url.pathname);
  if (native && url.hostname.startsWith("docs."))
    return { kind: "native", id: native[2] };

  const file = new RegExp(`/d/(${ID})`).exec(url.pathname);
  if (file) return { kind: "file", id: file[1] };

  const param = url.searchParams.get("id");
  if (param && new RegExp(`^${ID}$`).test(param))
    return { kind: "file", id: param };

  return null;
}

/** Varios links (uno por línea, o separados por espacios/comas). */
export function parseDriveLinks(input: string) {
  const ok: DriveLink[] = [];
  const invalidos: string[] = [];
  for (const part of input.split(/[\s,]+/).filter(Boolean)) {
    const link = parseDriveLink(part);
    if (link) ok.push(link);
    else invalidos.push(part);
  }
  return { ok, invalidos };
}
