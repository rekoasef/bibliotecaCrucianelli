"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/forms/form-state";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getDrive, pathFromRoot } from "@/lib/drive";
import { parseDriveLink, parseDriveLinks } from "@/lib/drive/links";
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
  const raw = formData.get("foto");
  // Del explorador llega el ID; en modo links públicos, el link pegado.
  const driveId =
    typeof raw === "string" ? (parseDriveLink(raw)?.id ?? raw.trim()) : "";
  if (!driveId) return { error: "Elegí una imagen." };

  const drive = getDrive();
  const item = drive.browsable
    ? (await pathFromRoot(driveId))?.at(-1)
    : await drive.getItem(driveId);
  if (!item || !isImage(item.mimeType)) {
    return {
      error: drive.browsable
        ? "El archivo no es una imagen o está fuera de las carpetas permitidas."
        : "No se pudo abrir como imagen. Revisá que el link sea de una imagen compartida con “Cualquier persona con el vínculo”.",
    };
  }
  await db
    .update(lineas)
    .set({ imagenDriveFileId: item.id })
    .where(eq(lineas.id, lineaId));
  revalidatePath("/admin/maquinas", "layout");
  redirect(`/admin/maquinas/lineas/${lineaId}?foto=1`);
}

/**
 * Incorporar pegando links de Drive (alternativa a navegar el explorador).
 * Los archivos siguen siendo privados: se leen con la cuenta de servicio y pasan
 * por las mismas validaciones (carpetas raíz, no duplicados).
 */
export async function incorporarDesdeLinks(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const texto = String(formData.get("links") ?? "");
  const agregarA = z
    .uuid()
    .optional()
    .safeParse(formData.get("agregarA") || undefined).data;
  const modo =
    formData.get("modo") === "uno-con-todos"
      ? "uno-con-todos"
      : "uno-por-archivo";
  const values = { links: texto };

  const { ok, invalidos } = parseDriveLinks(texto);
  if (ok.length === 0 && invalidos.length === 0)
    return { error: "Pegá al menos un link.", values };
  if (invalidos.length > 0) {
    return {
      error: `No se reconocen como links de Drive: ${invalidos.slice(0, 3).join(", ")}`,
      values,
    };
  }

  if (ok.some((l) => l.kind === "native")) {
    return {
      error:
        "Los Google Docs, Sheets y Slides no se pueden incorporar: exportalos a PDF (Archivo → Descargar → PDF), subí el PDF a Drive y pegá su link.",
      values,
    };
  }

  const carpetas = ok.filter((l) => l.kind === "folder");
  if (carpetas.length > 0 && !getDrive().browsable) {
    return {
      error:
        "Pegá links de archivos, no de carpetas (sin conexión a Google Cloud no se pueden recorrer carpetas).",
      values,
    };
  }
  if (carpetas.length > 0) {
    if (carpetas.length === 1 && ok.length === 1) {
      redirect(
        `/admin/drive?${new URLSearchParams({ carpeta: carpetas[0].id, ...(agregarA ? { agregarA } : {}) })}`,
      );
    }
    return {
      error:
        "Pegá links de archivos. Los links de carpetas, de a uno (se abren en el explorador).",
      values,
    };
  }

  const ids = ok.map((l) => l.id);
  let creados: string[] = [];
  try {
    if (agregarA) await agregarArchivos(agregarA, ids, admin.id);
    else creados = await incorporarDesdeDrive(ids, modo, admin.id);
  } catch (error) {
    if (error instanceof DocumentoError)
      return { error: error.message, values };
    throw error;
  }

  revalidatePath("/admin", "layout");
  if (agregarA)
    redirect(`/admin/documentos/${agregarA}?agregados=${ids.length}`);
  if (creados.length === 1)
    redirect(`/admin/documentos/${creados[0]}?creado=1`);
  redirect(`/admin/documentos?estado=borrador&creados=${creados.length}`);
}
