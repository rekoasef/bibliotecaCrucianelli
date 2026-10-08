import type { ModoAcceso } from "@/db/schema";

type Publicable = {
  titulo: string | null;
  tipoId: string | null;
  cantidadArchivos: number;
  cantidadMaquinas: number;
  cantidadProductos: number;
};

/** Públicos de un documento además de fábrica, que ve todo (docs/04, "Visibilidad"). */
export type Publicos = {
  visibleConcesionarios: boolean;
  visibleClientes: boolean;
};

/** "Concesionarios y clientes", "Solo fábrica"… para mostrar en el admin. */
export function publicosLabel(p: Publicos) {
  if (p.visibleConcesionarios && p.visibleClientes)
    return "Concesionarios y clientes";
  if (p.visibleConcesionarios) return "Concesionarios";
  if (p.visibleClientes) return "Clientes";
  return "Solo fábrica";
}

/** Requisitos para publicar (docs/03): devuelve lo que falta, vacío si está listo. */
export function faltantesParaPublicar(doc: Publicable): string[] {
  const faltan: string[] = [];
  if (!doc.titulo?.trim()) faltan.push("Falta el título.");
  if (!doc.tipoId) faltan.push("Falta el tipo de documento.");
  if (doc.cantidadArchivos === 0) faltan.push("Falta al menos un archivo.");
  // Tecnología y accesorios pueden no corresponder a una máquina puntual.
  if (doc.cantidadMaquinas === 0 && doc.cantidadProductos === 0)
    faltan.push("Falta asociarlo al menos a una máquina o a un producto.");
  return faltan;
}

/**
 * Advertencias para el admin. Un video con link público en un documento "Solo fábrica"
 * lo podría abrir cualquiera que tenga el link (docs/02): debería ir en modo servidor.
 */
export function advertenciasArchivos(
  publicos: Publicos,
  archivos: { nombre: string; modoAcceso: ModoAcceso; disponible: boolean }[],
): string[] {
  const avisos: string[] = [];
  if (!publicos.visibleConcesionarios && !publicos.visibleClientes) {
    for (const a of archivos.filter((a) => a.modoAcceso === "publico")) {
      avisos.push(
        `"${a.nombre}" tiene link público de Drive y el documento es "Solo fábrica": pasalo a modo servidor.`,
      );
    }
  }
  for (const a of archivos.filter((a) => !a.disponible)) {
    avisos.push(
      `"${a.nombre}" no está disponible en Drive (borrado o sin acceso).`,
    );
  }
  return avisos;
}

/**
 * Máquinas en dos niveles (docs/03): si está asociada la línea completa, sus modelos
 * sobran. Devuelve los modelos a guardar.
 */
export function modelosSinLineaCubierta(
  lineaIds: string[],
  modelos: { id: string; lineaId: string }[],
): string[] {
  const lineas = new Set(lineaIds);
  return modelos.filter((m) => !lineas.has(m.lineaId)).map((m) => m.id);
}

/** "dosificador, Sensor ,, cardán" → nombres limpios y sin repetidos (por forma normalizada). */
export function parseEtiquetas(
  input: string,
  normalize: (s: string) => string,
): string[] {
  const vistos = new Set<string>();
  const result: string[] = [];
  for (const raw of input.split(",")) {
    const nombre = raw.trim().replace(/\s+/g, " ");
    const key = normalize(nombre);
    if (!nombre || vistos.has(key)) continue;
    vistos.add(key);
    result.push(nombre);
  }
  return result;
}
