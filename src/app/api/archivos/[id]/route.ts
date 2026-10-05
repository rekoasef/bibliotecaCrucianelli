import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { contentDisposition } from "@/lib/content-disposition";
import { getArchivoVisible, registrarAcceso } from "@/lib/documentos/queries";
import { DriveNotFoundError, DriveRangeError, getDrive } from "@/lib/drive";
import { canDisplayInline } from "@/lib/drive/mime";

/**
 * Sirve archivos privados de Drive (modo servidor) — CLAUDE.md, regla 3.
 * 1. sesión, 2. permiso sobre el documento (documentVisibilityFilter),
 * 3. registro en `accesos`, 4. streaming desde Drive sin guardar en disco.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/archivos/[id]">,
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return notFound();

  const user = await getCurrentUser();
  if (!user) {
    // Desde el navegador (abrir el PDF en otra pestaña) se vuelve al login.
    if (request.headers.get("accept")?.includes("text/html")) {
      const url = new URL("/login", request.url);
      url.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(url);
    }
    return new NextResponse("No autorizado", { status: 401 });
  }

  // Sin permiso responde igual que si no existiera: no revela qué IDs hay.
  const archivo = await getArchivoVisible(id, user);
  if (!archivo || !archivo.disponible) return notFound();

  const descargar = request.nextUrl.searchParams.get("descargar") === "1";
  const range = request.headers.get("range");

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

  // Un visor de PDF pide muchos rangos: se registra solo el primer pedido.
  if (!range || /^bytes=0-/.test(range)) {
    await registrarAcceso({
      usuarioId: user.id,
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
