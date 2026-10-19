/**
 * Server Actions del admin de taxonomía: catálogos (tipos, sistemas, temas,
 * productos, tecnologías) y etiquetas. Cada una empieza con `requireAdmin()`.
 *
 * @module
 */

"use server";

import { eq, sql } from "drizzle-orm";
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
import { documentoEtiquetas, etiquetas } from "@/db/schema";
import { formValues, type FormState } from "@/components/forms/form-state";
import { requireAdmin } from "@/lib/auth/session";
import {
  rebuildDocumentSearch,
  rebuildSearchForTaxonomia,
} from "@/lib/search/reindex";
import { normalizeTag } from "@/lib/text";
import {
  CATALOGOS,
  catalogoSchema,
  etiquetaSchema,
} from "@/lib/validation/taxonomia";

/** Catálogo editado. */
const catalogoKind = z.enum(CATALOGOS);

/** IDs de la base (UUID). */
const idSchema = z.uuid();

/** Revalida la página de taxonomía. */
function revalidate() {
  revalidatePath("/admin/taxonomia");
}

// ── Tipos, sistemas, temas ──────────────────────────────────────────────────

/**
 * Crea o renombra una entrada de un catálogo. Al renombrar, recalcula el índice
 * de los documentos que la usan.
 *
 * @param _prev - Estado anterior del formulario (no se usa).
 * @param formData - `kind`, `id` (si es edición) y los campos de la entrada.
 * @returns Errores por campo (nombre o slug repetido) o el mensaje de éxito.
 */
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
      await rebuildSearchForTaxonomia(kind, id);
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

/**
 * Mueve una entrada un lugar arriba o abajo.
 *
 * @param formData - `kind`, `id` y `direction`.
 */
export async function moveCatalogo(formData: FormData) {
  await requireAdmin();
  const kind = catalogoKind.parse(formData.get("kind"));
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  await moveItem(kind, id, direction);
  revalidate();
}

/**
 * Activa o desactiva una entrada (las inactivas no se ofrecen al clasificar ni
 * como filtro).
 *
 * @param formData - `kind`, `id` y `activo` (`"true"`/`"false"`).
 */
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

/**
 * Crea o renombra una etiqueta. Rechaza nombres que ya existen como otra
 * clasificación o como otra etiqueta equivalente (sin acentos ni mayúsculas).
 *
 * @param _prev - Estado anterior del formulario (no se usa).
 * @param formData - `id` (si es edición) y `nombre`.
 * @returns Errores por campo o el mensaje de éxito.
 */
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
      await rebuildSearchForTaxonomia("etiquetas", id);
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

/**
 * Fusiona la etiqueta `id` en otra (por nombre): los documentos pasan a la de
 * destino y la original se borra.
 *
 * @param _prev - Estado anterior del formulario (no se usa).
 * @param formData - `id` y `destino` (nombre de la etiqueta destino).
 * @returns Errores por campo; si sale bien, redirige con el aviso.
 */
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
    // Los documentos de la etiqueta pasan a la de destino (sin duplicar) y después
    // se borra la original (sus filas en documento_etiquetas caen en cascada).
    await tx.execute(sql`
      INSERT INTO documento_etiquetas (documento_id, etiqueta_id)
      SELECT documento_id, ${destino.id} FROM documento_etiquetas WHERE etiqueta_id = ${id}
      ON CONFLICT DO NOTHING
    `);
    await tx.delete(etiquetas).where(eq(etiquetas.id, id));
  });

  await rebuildSearchForTaxonomia("etiquetas", destino.id);
  revalidate();
  // La fila de la etiqueta fusionada desaparece: el aviso va arriba de la página.
  redirect(
    `/admin/taxonomia?tab=etiquetas&fusionada=${encodeURIComponent(destino.nombre)}`,
  );
}

/**
 * Borra una etiqueta, la quita de los documentos que la usan (cascada) y
 * recalcula su índice.
 *
 * @param formData - `id` de la etiqueta.
 */
export async function deleteEtiqueta(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  // Se quita de los documentos que la usan (cascada); el panel muestra cuántos son.
  const afectados = await db
    .select({ id: documentoEtiquetas.documentoId })
    .from(documentoEtiquetas)
    .where(eq(documentoEtiquetas.itemId, id));
  const [eliminada] = await db
    .delete(etiquetas)
    .where(eq(etiquetas.id, id))
    .returning({ nombre: etiquetas.nombre });
  for (const doc of afectados) await rebuildDocumentSearch(doc.id);
  revalidate();
  redirect(
    `/admin/taxonomia?tab=etiquetas&eliminada=${encodeURIComponent(eliminada?.nombre ?? "")}`,
  );
}
