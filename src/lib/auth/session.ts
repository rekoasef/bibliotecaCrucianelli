import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { concesionarios, usuarios, type RolUsuario } from "@/db/schema";
import { PATHNAME_HEADER } from "./constants";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  concesionarioId: string | null;
  concesionarioNombre: string | null;
};

/**
 * Usuario de la sesión actual, o null. Verifica en cada request que el usuario
 * y su concesionario sigan activos (además de invalidar sesiones al desactivar).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      concesionarioId: usuarios.concesionarioId,
      concesionarioNombre: concesionarios.nombre,
      concesionarioActivo: concesionarios.activo,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(eq(usuarios.id, session.user.id));

  if (!row || !row.activo || row.concesionarioActivo === false) return null;

  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    concesionarioId: row.concesionarioId,
    concesionarioNombre: row.concesionarioNombre,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const pathname = (await headers()).get(PATHNAME_HEADER);
    redirect(
      pathname && pathname !== "/"
        ? `/login?next=${encodeURIComponent(pathname)}`
        : "/login",
    );
  }
  return user;
}

/** Para páginas y Server Actions del admin. A otros roles les responde 404. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "admin") notFound();
  return user;
}
