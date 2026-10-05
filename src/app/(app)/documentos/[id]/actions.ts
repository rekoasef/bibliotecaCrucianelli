"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getArchivoVisible, registrarAcceso } from "@/lib/documentos/queries";

/** Registra la reproducción de un video embebido (docs/03: se registra desde el cliente). */
export async function registrarVideo(archivoId: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(archivoId).success) return;
  const archivo = await getArchivoVisible(archivoId, user);
  if (!archivo) return;
  await registrarAcceso({
    usuarioId: user.id,
    documentoId: archivo.documentoId,
    archivoId: archivo.id,
    accion: "video",
  });
}
