import { z } from "zod";

const textoOpcional = (max: number, campo: string) =>
  z
    .string()
    .trim()
    .max(max, `${campo} es demasiado largo.`)
    .optional()
    .transform((v) => v || null);

const ids = z.array(z.uuid()).default([]);

export const clasificacionSchema = z.object({
  titulo: textoOpcional(200, "El título"),
  descripcion: textoOpcional(2000, "La descripción"),
  tipoId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  version: textoOpcional(50, "La versión"),
  fechaDocumento: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.iso.date("Fecha inválida.").nullable()),
  // Casillas "Concesionarios" y "Clientes" (fábrica ve todo; ninguna = Solo fábrica).
  visibleConcesionarios: z.boolean().default(false),
  visibleClientes: z.boolean().default(false),
  lineaIds: ids,
  modeloIds: ids,
  sistemaIds: ids,
  temaIds: ids,
  productoIds: ids,
  etiquetas: z.string().max(1000).default(""),
});

/** FormData → objeto para `clasificacionSchema` (los checkboxes llegan repetidos). */
export function clasificacionFromForm(formData: FormData) {
  const all = (name: string) =>
    formData.getAll(name).filter((v): v is string => typeof v === "string");
  const one = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  return {
    titulo: one("titulo"),
    descripcion: one("descripcion"),
    tipoId: one("tipoId"),
    version: one("version"),
    fechaDocumento: one("fechaDocumento"),
    visibleConcesionarios: all("publicos").includes("concesionarios"),
    visibleClientes: all("publicos").includes("clientes"),
    lineaIds: all("lineas"),
    modeloIds: all("modelos"),
    sistemaIds: all("sistemas"),
    temaIds: all("temas"),
    productoIds: all("productos"),
    etiquetas: one("etiquetas") ?? "",
  };
}
