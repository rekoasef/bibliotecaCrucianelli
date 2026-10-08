import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lineas, segmentos } from "@/db/schema";
import { getViewer } from "@/lib/auth/session";
import { DriveNotFoundError, getDrive } from "@/lib/drive";
import { canDisplayInline } from "@/lib/drive/mime";

/**
 * Foto de una línea para la navegación por máquina. Solo líneas visibles para quien
 * mira (sin sesión, como cliente final: acceso libre).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/lineas/[id]/foto">,
) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return notFound();
  const { viewer } = await getViewer();

  const [linea] = await db
    .select({ driveId: lineas.imagenDriveFileId })
    .from(lineas)
    .innerJoin(segmentos, eq(lineas.segmentoId, segmentos.id))
    .where(
      and(
        eq(lineas.id, id),
        viewer.rol === "admin"
          ? undefined
          : and(eq(lineas.activo, true), eq(segmentos.activo, true)),
      ),
    );
  if (!linea?.driveId) return notFound();

  try {
    const download = await getDrive().download(linea.driveId);
    if (!canDisplayInline(download.contentType)) return notFound();
    const headers = new Headers({
      "Content-Type": download.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
    });
    if (download.contentLength != null)
      headers.set("Content-Length", String(download.contentLength));
    return new NextResponse(download.body, { headers });
  } catch (error) {
    if (error instanceof DriveNotFoundError) return notFound();
    throw error;
  }
}

function notFound() {
  return new NextResponse("No encontrado", { status: 404 });
}
