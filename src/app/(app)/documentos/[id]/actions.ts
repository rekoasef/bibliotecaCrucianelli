/**
 * Server Actions de la ficha pública de un documento.
 *
 * @module
 */

"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { getArchivoVisible, registrarAcceso } from "@/lib/documentos/queries";
import { hit, rateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/**
 * Registra la reproducción de un video embebido (docs/03: se registra desde el
 * cliente). Es de acceso libre: sin sesión es un cliente final, pero igual se
 * verifica que pueda ver el documento y se limita por IP.
 *
 * @param archivoId - Archivo de video (se ignora si no es un UUID o no es
 *   visible).
 */
export async function registrarVideo(archivoId: string) {
  // Sin sesión es un cliente final: igual se verifica que pueda ver el documento.
  const { user, viewer } = await getViewer();
  if (!z.uuid().safeParse(archivoId).success) return;
  const archivo = await getArchivoVisible(archivoId, viewer);
  if (!archivo) return;
  if (!user) {
    const limit = await hit(
      `videos:ip:${await getClientIp()}`,
      rateLimits.videosClienteIp,
    );
    if (!limit.allowed) return;
  }
  await registrarAcceso({
    usuarioId: user?.id ?? null,
    documentoId: archivo.documentoId,
    archivoId: archivo.id,
    accion: "video",
  });
}
