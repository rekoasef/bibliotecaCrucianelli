"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { uniqueViolationConstraint } from "@/db/errors";
import {
  getLinea,
  getModelo,
  moveItem,
  nextOrden,
} from "@/db/queries/taxonomia";
import { lineas, modelos, segmentos } from "@/db/schema";
import type { FormState } from "@/components/forms/form-state";
import { requireAdmin } from "@/lib/auth/session";
import {
  lineaSchema,
  modeloSchema,
  NIVELES,
  segmentoSchema,
} from "@/lib/validation/taxonomia";

// TODO(Fase 4): al renombrar, recalcular el índice de búsqueda de los documentos asociados.

const nivelSchema = z.enum(NIVELES);
const idSchema = z.uuid();

function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
}

const CONSTRAINT_ERRORS: Record<string, [field: string, message: string]> = {
  segmentos_nombre_unique: ["nombre", "Ya existe un segmento con ese nombre."],
  segmentos_slug_unique: ["slug", "Ese slug ya lo usa otro segmento."],
  lineas_segmento_nombre_unique: [
    "nombre",
    "Ya hay una línea con ese nombre en el segmento.",
  ],
  lineas_slug_unique: ["slug", "Ese slug ya lo usa otra línea."],
  modelos_linea_nombre_unique: [
    "nombre",
    "Ya hay un modelo con ese nombre en la línea.",
  ],
  modelos_slug_unique: ["slug", "Ese slug ya lo usa otro modelo."],
};

export async function saveMaquina(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const nivel = nivelSchema.parse(values.nivel);
  const id = values.id ? idSchema.parse(values.id) : null;

  let savedId = id;
  try {
    if (nivel === "segmentos") {
      const parsed = segmentoSchema.safeParse(values);
      if (!parsed.success)
        return {
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
          values,
        };
      if (id) {
        await db.update(segmentos).set(parsed.data).where(eq(segmentos.id, id));
      } else {
        const orden = await nextOrden("segmentos");
        [{ id: savedId }] = await db
          .insert(segmentos)
          .values({ ...parsed.data, orden })
          .returning({ id: segmentos.id });
      }
    }

    if (nivel === "lineas") {
      const parsed = lineaSchema.safeParse(values);
      if (!parsed.success)
        return {
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
          values,
        };
      const anterior = id ? await getLinea(id) : null;
      if (id && anterior) {
        // Si cambia de segmento, va al final de la lista del nuevo.
        const orden =
          anterior.segmentoId !== parsed.data.segmentoId
            ? await nextOrden("lineas", parsed.data.segmentoId)
            : anterior.orden;
        await db
          .update(lineas)
          .set({ ...parsed.data, orden })
          .where(eq(lineas.id, id));
      } else {
        const orden = await nextOrden("lineas", parsed.data.segmentoId);
        [{ id: savedId }] = await db
          .insert(lineas)
          .values({ ...parsed.data, orden })
          .returning({ id: lineas.id });
      }
    }

    if (nivel === "modelos") {
      const parsed = modeloSchema.safeParse(values);
      if (!parsed.success)
        return {
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
          values,
        };
      const anterior = id ? await getModelo(id) : null;
      if (id && anterior) {
        const orden =
          anterior.lineaId !== parsed.data.lineaId
            ? await nextOrden("modelos", parsed.data.lineaId)
            : anterior.orden;
        await db
          .update(modelos)
          .set({ ...parsed.data, orden })
          .where(eq(modelos.id, id));
      } else {
        const orden = await nextOrden("modelos", parsed.data.lineaId);
        [{ id: savedId }] = await db
          .insert(modelos)
          .values({ ...parsed.data, orden })
          .returning({ id: modelos.id });
      }
    }
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    const mapped = constraint && CONSTRAINT_ERRORS[constraint];
    if (!mapped) throw error;
    // Si el slug se generó solo (campo vacío), el problema es el nombre: mostrarlo ahí.
    if (mapped[0] === "slug" && !values.slug?.trim()) {
      return {
        fieldErrors: {
          nombre: [
            "Ya existe uno con este nombre o uno equivalente. Cambiá el nombre o cargá un slug distinto.",
          ],
        },
        values,
      };
    }
    return { fieldErrors: { [mapped[0]]: [mapped[1]] }, values };
  }

  revalidatePath("/admin/maquinas", "layout");
  if (!id) redirect(`/admin/maquinas/${nivel}/${savedId}?creado=1`);
  return { success: "Cambios guardados.", values };
}

export async function moveMaquina(formData: FormData) {
  await requireAdmin();
  const nivel = nivelSchema.parse(formData.get("nivel"));
  const id = idSchema.parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  await moveItem(nivel, id, direction);
  revalidatePath("/admin/maquinas", "layout");
}

export async function setMaquinaActivo(formData: FormData) {
  await requireAdmin();
  const nivel = nivelSchema.parse(formData.get("nivel"));
  const id = idSchema.parse(formData.get("id"));
  const activo = formData.get("activo") === "true";

  const table = { segmentos, lineas, modelos }[nivel];
  await db.update(table).set({ activo }).where(eq(table.id, id));
  revalidatePath("/admin/maquinas", "layout");
}

export async function quitarFotoLinea(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await db
    .update(lineas)
    .set({ imagenDriveFileId: null })
    .where(eq(lineas.id, id));
  revalidatePath("/admin/maquinas", "layout");
}
