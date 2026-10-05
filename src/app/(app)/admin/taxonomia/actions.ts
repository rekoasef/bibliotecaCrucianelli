"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { uniqueViolationConstraint } from "@/db/errors";
import {
  catalogoTables,
  findClasificacionExistente,
  moveItem,
  nextOrden,
} from "@/db/queries/taxonomia";
import { etiquetas } from "@/db/schema";
import type { FormState } from "@/components/forms/form-state";
import { requireAdmin } from "@/lib/auth/session";
import { normalizeTag } from "@/lib/text";
import {
  CATALOGOS,
  catalogoSchema,
  etiquetaSchema,
} from "@/lib/validation/taxonomia";

// TODO(Fase 4): al renombrar, recalcular el índice de búsqueda de los documentos afectados.

const catalogoKind = z.enum(CATALOGOS);
const idSchema = z.uuid();

function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
}

function revalidate() {
  revalidatePath("/admin/taxonomia");
}

// ── Tipos, sistemas, temas ──────────────────────────────────────────────────

export async function saveCatalogo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const kind = catalogoKind.parse(values.kind);
  const id = values.id ? idSchema.parse(values.id) : null;

  const parsed = catalogoSchema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const table = catalogoTables[kind];
  try {
    if (id) {
      await db.update(table).set(parsed.data).where(eq(table.id, id));
    } else {
      await db
        .insert(table)
        .values({ ...parsed.data, orden: await nextOrden(kind) });
    }
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint?.endsWith("_nombre_unique")) {
      return { fieldErrors: { nombre: ["Ya existe con ese nombre."] }, values };
    }
    if (constraint?.endsWith("_slug_unique")) {
      // Slug generado del nombre (campo vacío): el conflicto es por el nombre.
      return values.slug?.trim()
        ? { fieldErrors: { slug: ["Ese slug ya está en uso."] }, values }
        : {
            fieldErrors: {
              nombre: ["Ya existe uno con un nombre equivalente."],
            },
            values,
          };
    }
    throw error;
  }

  revalidate();
  return id
    ? { success: "Cambios guardados.", values }
    : { success: `"${parsed.data.nombre}" agregado.` };
}

export async function moveCatalogo(formData: FormData) {
  await requireAdmin();
  const kind = catalogoKind.parse(formData.get("kind"));
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  await moveItem(kind, id, direction);
  revalidate();
}

export async function setCatalogoActivo(formData: FormData) {
  await requireAdmin();
  const kind = catalogoKind.parse(formData.get("kind"));
  const id = idSchema.parse(formData.get("id"));
  const table = catalogoTables[kind];
  await db
    .update(table)
    .set({ activo: formData.get("activo") === "true" })
    .where(eq(table.id, id));
  revalidate();
}

// ── Etiquetas ───────────────────────────────────────────────────────────────

export async function saveEtiqueta(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const id = values.id ? idSchema.parse(values.id) : null;

  const parsed = etiquetaSchema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const nombre = parsed.data.nombre;
  const nombreNormalizado = normalizeTag(nombre);

  const existente = await findClasificacionExistente(nombreNormalizado);
  if (existente) {
    return {
      fieldErrors: {
        nombre: [
          `"${existente.nombre}" ya existe como ${existente.donde}: no hace falta como etiqueta.`,
        ],
      },
      values,
    };
  }

  try {
    if (id) {
      await db
        .update(etiquetas)
        .set({ nombre, nombreNormalizado })
        .where(eq(etiquetas.id, id));
    } else {
      await db.insert(etiquetas).values({ nombre, nombreNormalizado });
    }
  } catch (error) {
    if (
      uniqueViolationConstraint(error) === "etiquetas_nombre_normalizado_unique"
    ) {
      return {
        fieldErrors: {
          nombre: [
            id
              ? "Ya existe otra etiqueta equivalente. Usá “Fusionar” para unirlas."
              : "Esa etiqueta ya existe.",
          ],
        },
        values,
      };
    }
    throw error;
  }

  revalidate();
  return id
    ? { success: "Etiqueta renombrada.", values }
    : { success: `Etiqueta "${nombre}" agregada.` };
}

/** Fusiona la etiqueta `id` en otra (por nombre): los documentos pasan a la de destino. */
export async function mergeEtiqueta(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const destinoNombre = normalizeTag(String(formData.get("destino") ?? ""));
  if (!destinoNombre)
    return { fieldErrors: { destino: ["Elegí la etiqueta de destino."] } };

  const [destino] = await db
    .select()
    .from(etiquetas)
    .where(eq(etiquetas.nombreNormalizado, destinoNombre));
  if (!destino)
    return { fieldErrors: { destino: ["No existe esa etiqueta."] } };
  if (destino.id === id)
    return { fieldErrors: { destino: ["Elegí una etiqueta distinta."] } };

  await db.transaction(async (tx) => {
    // TODO(Fase 3): mover las filas de documento_etiquetas de `id` a `destino.id`
    // (sin duplicar) y recalcular el índice de búsqueda de esos documentos.
    await tx.delete(etiquetas).where(inArray(etiquetas.id, [id]));
  });

  revalidate();
  // La fila de la etiqueta fusionada desaparece: el aviso va arriba de la página.
  redirect(
    `/admin/taxonomia?tab=etiquetas&fusionada=${encodeURIComponent(destino.nombre)}`,
  );
}

export async function deleteEtiqueta(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  // TODO(Fase 3): permitir solo si no la usa ningún documento (o advertir).
  const [eliminada] = await db
    .delete(etiquetas)
    .where(eq(etiquetas.id, id))
    .returning({ nombre: etiquetas.nombre });
  revalidate();
  redirect(
    `/admin/taxonomia?tab=etiquetas&eliminada=${encodeURIComponent(eliminada?.nombre ?? "")}`,
  );
}
