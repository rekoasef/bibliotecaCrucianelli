import { z } from "zod";
import { slugify } from "@/lib/text";

const nombre = z
  .string()
  .trim()
  .min(1, "Completá el nombre.")
  .max(80, "El nombre es demasiado largo.");

const descripcion = z
  .string()
  .trim()
  .max(500, "La descripción es demasiado larga.")
  .optional()
  .transform((v) => v || null);

/** Slug opcional: si viene vacío se genera desde el nombre. */
function withSlug<T extends { nombre: string; slug?: string }>(data: T) {
  return { ...data, slug: data.slug ? data.slug : slugify(data.nombre) };
}

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Solo minúsculas, números y guiones (ej.: gringa-v).",
  )
  .max(80)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const segmentoSchema = z.object({ nombre, slug }).transform(withSlug);

export const lineaSchema = z
  .object({
    nombre,
    slug,
    descripcion,
    segmentoId: z.uuid("Elegí un segmento."),
  })
  .transform(withSlug);

export const modeloSchema = z
  .object({ nombre, slug, descripcion, lineaId: z.uuid("Elegí una línea.") })
  .transform(withSlug);

export const catalogoSchema = z.object({ nombre, slug }).transform(withSlug);

export const etiquetaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Completá la etiqueta.")
    .max(60, "La etiqueta es demasiado larga."),
});

export const NIVELES = ["segmentos", "lineas", "modelos"] as const;
export type Nivel = (typeof NIVELES)[number];

export const CATALOGOS = ["tipos", "sistemas", "temas"] as const;
export type Catalogo = (typeof CATALOGOS)[number];
