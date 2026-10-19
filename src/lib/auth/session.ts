/**
 * Sesión del usuario en el servidor: quién está mirando y guardas de acceso
 * para páginas y Server Actions (CLAUDE.md, "Auth y permisos").
 *
 * @module
 */

import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { concesionarios, usuarios, type RolUsuario } from "@/db/schema";
import { CLIENTE, type Viewer } from "@/lib/documentos/visibility";
import { env } from "@/lib/env";
import { PATHNAME_HEADER } from "./constants";
import { auth, pausarUsuario } from "./auth";
import { ACTIVIDAD_INTERVALO_MS, superaInactividad } from "./inactividad";

/**
 * Usuario autenticado tal como lo ve la app (sin datos sensibles de la base).
 */
export type CurrentUser = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  concesionarioId: string | null;
  concesionarioNombre: string | null;
};

/**
 * Usuario de la sesión actual, o `null`.
 *
 * Verifica en cada request que el usuario y su concesionario sigan activos y
 * que la cuenta no esté pausada por inactividad (además de invalidar sesiones
 * al desactivar o pausar). De paso registra el uso en `ultima_actividad`, como
 * mucho una vez por hora (`ACTIVIDAD_INTERVALO_MS`). Memoizado por request con
 * `cache` de React.
 *
 * @returns El usuario habilitado, o `null` si no hay sesión o la cuenta no
 *   puede usar la app. Si recién superó el plazo de inactividad, la pausa y
 *   devuelve `null`.
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
      pausadoEn: usuarios.pausadoEn,
      ultimaActividad: usuarios.ultimaActividad,
      ultimoIngreso: usuarios.ultimoIngreso,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(eq(usuarios.id, session.user.id));

  if (!row || !row.activo || row.concesionarioActivo === false) return null;
  if (row.pausadoEn) return null;

  const ahora = new Date();
  // La sesión se renueva sola con el uso: la inactividad se mide por actividad, no por login.
  if (superaInactividad(row, env().INACTIVIDAD_DIAS, ahora)) {
    await pausarUsuario(row.id);
    return null;
  }
  if (
    !row.ultimaActividad ||
    ahora.getTime() - row.ultimaActividad.getTime() > ACTIVIDAD_INTERVALO_MS
  ) {
    await db
      .update(usuarios)
      .set({ ultimaActividad: ahora })
      .where(eq(usuarios.id, row.id));
  }

  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    concesionarioId: row.concesionarioId,
    concesionarioNombre: row.concesionarioNombre,
  };
});

/**
 * Quién mira las páginas de consulta (inicio, búsqueda, máquinas, ficha,
 * archivos): el usuario con sesión o, sin sesión, un cliente final (acceso
 * libre, docs/01).
 *
 * @returns `user` (o `null`) y el `viewer` que siempre se pasa a
 *   `documentVisibilityFilter`.
 */
export async function getViewer(): Promise<{
  user: CurrentUser | null;
  viewer: Viewer;
}> {
  const user = await getCurrentUser();
  return { user, viewer: user ?? CLIENTE };
}

/**
 * Exige sesión. Va al principio de cada página privada y de cada Server Action.
 *
 * @returns El usuario de la sesión.
 * @remarks Sin sesión válida redirige a `/login?next=…` con la ruta pedida
 *   (header {@link PATHNAME_HEADER} que agrega el proxy); `redirect` corta la
 *   ejecución.
 */
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

/**
 * Exige sesión con rol `admin`. Para páginas y Server Actions del admin: cada
 * una lo llama (proteger el layout no protege las acciones).
 *
 * @returns El usuario administrador.
 * @remarks A otros roles les responde 404 (`notFound`), sin revelar que la ruta
 *   existe.
 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "admin") notFound();
  return user;
}
