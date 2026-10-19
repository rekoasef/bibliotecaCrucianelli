/**
 * Server Actions de la ficha de documento del admin. Cada una empieza con
 * `requireAdmin()` (directamente o por `runEstado`).
 *
 * @module
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/forms/form-state";
import { requireAdmin } from "@/lib/auth/session";
import {
  DocumentoError,
  eliminarBorrador,
  guardarClasificacion,
  marcarObsoleto,
  marcarRevisado,
  moverArchivo,
  nuevaVersion,
  publicar,
  quitarArchivo,
  reintentarExtraccion,
  restaurarVigente,
  setModoAcceso,
  siguienteBorrador,
} from "@/lib/documentos/service";
import {
  clasificacionFromForm,
  clasificacionSchema,
} from "@/lib/validation/documentos";

/** IDs de la base (UUID). */
const idSchema = z.uuid();

/**
 * Revalida el admin y, si se indica, la ficha pública del documento.
 *
 * @param id - Documento cuya ficha cambió.
 */
function revalidate(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/documentos/${id}`);
}

/**
 * Guardar, publicar o "guardar y siguiente", según el botón que se apretó
 * (`intent`).
 *
 * @param _prev - Estado anterior del formulario (no se usa).
 * @param formData - Clasificación del documento, `id` e `intent`.
 * @returns Errores o el mensaje de éxito; al publicar o pasar al siguiente,
 *   redirige. Si publicar falla, lo guardado queda guardado.
 */
export async function saveDocumento(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const intent = z
    .enum(["guardar", "publicar", "siguiente"])
    .catch("guardar")
    .parse(formData.get("intent"));

  const parsed = clasificacionSchema.safeParse(clasificacionFromForm(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    await guardarClasificacion(id, parsed.data, admin.id);
    if (intent === "publicar") await publicar(id, admin.id);
  } catch (error) {
    if (error instanceof DocumentoError) {
      revalidate(id);
      return {
        error:
          intent === "publicar"
            ? `Se guardó, pero no se puede publicar todavía. ${error.message}`
            : error.message,
      };
    }
    throw error;
  }

  revalidate(id);
  if (intent === "publicar") redirect(`/admin/documentos/${id}?publicado=1`);
  if (intent === "siguiente") {
    const next = await siguienteBorrador(id);
    redirect(
      next
        ? `/admin/documentos/${next}?anterior=guardado`
        : "/admin/documentos?estado=borrador&todos=1",
    );
  }
  return { success: "Cambios guardados." };
}

/**
 * Verifica el rol, valida el `id` y aplica un cambio de estado. Si la regla de
 * negocio no lo permite, vuelve a la ficha con `?error=estado`.
 *
 * @param formData - Formulario con `id`.
 * @param fn - Operación de `service.ts` a aplicar.
 * @returns El ID del documento.
 */
async function runEstado(
  formData: FormData,
  fn: (id: string, adminId: string) => Promise<unknown>,
) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  try {
    await fn(id, admin.id);
  } catch (error) {
    if (error instanceof DocumentoError)
      redirect(`/admin/documentos/${id}?error=${encodeURIComponent("estado")}`);
    throw error;
  }
  revalidate(id);
  return id;
}

/**
 * Marca el documento como obsoleto.
 *
 * @param formData - `id`.
 */
export async function marcarObsoletoAction(formData: FormData) {
  const id = await runEstado(formData, marcarObsoleto);
  redirect(`/admin/documentos/${id}`);
}

/**
 * Vuelve a vigente un obsoleto.
 *
 * @param formData - `id`.
 */
export async function restaurarVigenteAction(formData: FormData) {
  const id = await runEstado(formData, restaurarVigente);
  redirect(`/admin/documentos/${id}`);
}

/**
 * Crea (o retoma) el borrador de una nueva versión y lleva al explorador de
 * Drive para elegir el archivo nuevo (docs/05).
 *
 * @param formData - `id` del documento vigente.
 */
export async function nuevaVersionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const nuevoId = await nuevaVersion(id, admin.id);
  revalidate();
  // El admin elige el archivo nuevo en Drive (docs/05).
  redirect(`/admin/drive?agregarA=${nuevoId}`);
}

/**
 * Elimina un borrador y vuelve al listado.
 *
 * @param formData - `id`.
 */
export async function eliminarBorradorAction(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await eliminarBorrador(id);
  revalidate();
  redirect("/admin/documentos?eliminado=1");
}

// ── Archivos ────────────────────────────────────────────────────────────────

/**
 * Cambia el modo de acceso de un archivo (servidor o link público).
 *
 * @param formData - `id` del documento, `archivoId` y `modo`.
 */
export async function setModoAccesoAction(formData: FormData) {
  await requireAdmin();
  const archivoId = idSchema.parse(formData.get("archivoId"));
  const modo = z.enum(["servidor", "publico"]).parse(formData.get("modo"));
  await setModoAcceso(archivoId, modo);
  revalidate(idSchema.parse(formData.get("id")));
}

/**
 * Mueve un archivo un lugar arriba o abajo.
 *
 * @param formData - `id` del documento, `archivoId` y `direction`.
 */
export async function moverArchivoAction(formData: FormData) {
  await requireAdmin();
  await moverArchivo(
    idSchema.parse(formData.get("archivoId")),
    z.enum(["up", "down"]).parse(formData.get("direction")),
  );
  revalidate(idSchema.parse(formData.get("id")));
}

/**
 * Quita un archivo del documento (no el último de uno publicado: vuelve con
 * `?error=ultimo-archivo`).
 *
 * @param formData - `id` del documento y `archivoId`.
 */
export async function quitarArchivoAction(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  try {
    await quitarArchivo(idSchema.parse(formData.get("archivoId")));
  } catch (error) {
    if (error instanceof DocumentoError)
      redirect(`/admin/documentos/${id}?error=ultimo-archivo`);
    throw error;
  }
  revalidate(id);
}

/**
 * Vuelve a encolar la extracción de texto de un archivo (tras un error o sin
 * texto).
 *
 * @param formData - `id` del documento y `archivoId`.
 */
export async function reintentarExtraccionAction(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await reintentarExtraccion(idSchema.parse(formData.get("archivoId")));
  revalidate(id);
}

/**
 * Marca como revisado un documento cuyo archivo cambió en Drive.
 *
 * @param formData - `id` del documento.
 */
export async function marcarRevisadoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await marcarRevisado(id, admin.id);
  revalidate(id);
}
