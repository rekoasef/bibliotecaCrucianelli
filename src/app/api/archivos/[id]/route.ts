import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { contentDisposition } from "@/lib/content-disposition";
import { getArchivoVisible, registrarAcceso } from "@/lib/documentos/queries";
import { DriveNotFoundError, DriveRangeError, getDrive } from "@/lib/drive";
import { canDisplayInline } from "@/lib/drive/mime";
import { hit, rateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/**
 * Sirve archivos privados de Drive (modo servidor) — CLAUDE.md, regla 3.
 * 1. quién mira (sin sesión = cliente final), 2. permiso sobre el documento
 * (documentVisibilityFilter), 3. registro en `accesos`, 4. streaming desde Drive
 * sin guardar en disco.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/archivos/[id]">,
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return notFound();

  const { user, viewer } = await getViewer();

  // Sin permiso responde igual que si no existiera: no revela qué IDs hay.
  const archivo = await getArchivoVisible(id, viewer);
  if (!archivo || !archivo.disponible) return notFound();

  const descargar = request.nextUrl.searchParams.get("descargar") === "1";
  const range = request.headers.get("range");
  // Un visor de PDF pide muchos rangos: se cuenta (y registra) solo el primer pedido.
  const primerPedido = !range || /^bytes=0-/.test(range);

  if (!user && primerPedido) {
    const limit = await hit(
      `archivos:ip:${await getClientIp()}`,
      rateLimits.archivosClienteIp,
    );
    if (!limit.allowed) {
      return new NextResponse(
        "Demasiados pedidos. Probá de nuevo en un rato.",
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
  }

  let download;
  try {
    download = await getDrive().download(archivo.driveFileId, { range });
  } catch (error) {
    if (error instanceof DriveRangeError) {
      return new NextResponse(null, { status: 416 });
    }
    if (error instanceof DriveNotFoundError) {
      console.error(`Archivo ${archivo.id} no accesible en Drive`);
      return notFound();
    }
    throw error;
  }

  if (primerPedido) {
    await registrarAcceso({
      usuarioId: user?.id ?? null,
      documentoId: archivo.documentoId,
      archivoId: archivo.id,
      accion: descargar ? "descargar" : "ver",
    });
  }

  const inline = !descargar && canDisplayInline(download.contentType);
  const nombre =
    download.contentType === "application/pdf" &&
    !/\.pdf$/i.test(archivo.nombre)
      ? `${archivo.nombre}.pdf` // Google Docs exportados
      : archivo.nombre;

  const headers = new Headers({
    "Content-Type": download.contentType,
    "Content-Disposition": contentDisposition(
      inline ? "inline" : "attachment",
      nombre,
    ),
    "X-Content-Type-Options": "nosniff",
    // Privado y corto: si cambian los permisos, el navegador no lo guarda mucho.
    "Cache-Control": "private, max-age=300",
  });
  if (download.contentLength != null) {
    headers.set("Content-Length", String(download.contentLength));
    headers.set("Accept-Ranges", "bytes");
  }
  if (download.contentRange)
    headers.set("Content-Range", download.contentRange);

  return new NextResponse(download.body, { status: download.status, headers });
}

function notFound() {
  return new NextResponse("No encontrado", { status: 404 });
}
