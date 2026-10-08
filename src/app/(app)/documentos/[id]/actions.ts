"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { getArchivoVisible, registrarAcceso } from "@/lib/documentos/queries";

/** Registra la reproducción de un video embebido (docs/03: se registra desde el cliente). */
export async function registrarVideo(archivoId: string) {
  // Sin sesión es un cliente final: igual se verifica que pueda ver el documento.
  const { user, viewer } = await getViewer();
  if (!z.uuid().safeParse(archivoId).success) return;
  const archivo = await getArchivoVisible(archivoId, viewer);
  if (!archivo) return;
  await registrarAcceso({
    usuarioId: user?.id ?? null,
    documentoId: archivo.documentoId,
    archivoId: archivo.id,
    accion: "video",
  });
}
