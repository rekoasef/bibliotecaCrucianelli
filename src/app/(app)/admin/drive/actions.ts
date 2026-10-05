"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/forms/form-state";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { pathFromRoot } from "@/lib/drive";
import { isImage } from "@/lib/drive/mime";
import {
  agregarArchivos,
  DocumentoError,
  incorporarDesdeDrive,
} from "@/lib/documentos/service";

export async function incorporar(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const ids = formData
    .getAll("archivos")
    .filter((v): v is string => typeof v === "string");
  const agregarA = z
    .uuid()
    .optional()
    .safeParse(formData.get("agregarA") || undefined).data;
  const modo =
    formData.get("modo") === "uno-con-todos"
      ? "uno-con-todos"
      : "uno-por-archivo";

  if (ids.length === 0) return { error: "Marcá al menos un archivo." };

  let creados: string[] = [];
  try {
    if (agregarA) {
      await agregarArchivos(agregarA, ids, admin.id);
    } else {
      creados = await incorporarDesdeDrive(ids, modo, admin.id);
    }
  } catch (error) {
    if (error instanceof DocumentoError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin", "layout");
  if (agregarA)
    redirect(`/admin/documentos/${agregarA}?agregados=${ids.length}`);
  if (creados.length === 1)
    redirect(`/admin/documentos/${creados[0]}?creado=1`);
  redirect(`/admin/documentos?estado=borrador&creados=${creados.length}`);
}

/** Foto de una línea (docs/05, admin de máquinas): una imagen dentro de las raíces. */
export async function elegirFotoLinea(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const lineaId = z.uuid().parse(formData.get("fotoLinea"));
  const driveId = formData.get("foto");
  if (typeof driveId !== "string" || !driveId)
    return { error: "Elegí una imagen." };

  const item = (await pathFromRoot(driveId))?.at(-1);
  if (!item || !isImage(item.mimeType)) {
    return {
      error:
        "El archivo no es una imagen o está fuera de las carpetas permitidas.",
    };
  }
  await db
    .update(lineas)
    .set({ imagenDriveFileId: item.id })
    .where(eq(lineas.id, lineaId));
  revalidatePath("/admin/maquinas", "layout");
  redirect(`/admin/maquinas/lineas/${lineaId}?foto=1`);
}
