import "server-only";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  concesionarios,
  sesiones,
  usuarios,
  type RolUsuario,
} from "@/db/schema";

/** true si el usuario ya definió su contraseña (aceptó la invitación). */
const tienePassword = sql<boolean>`exists (select 1 from cuentas c where c.user_id = ${usuarios.id})`;

export type EstadoUsuario = "activo" | "inactivo" | "pendiente";

export type UsuarioFilters = {
  rol?: RolUsuario;
  concesionarioId?: string;
  estado?: EstadoUsuario;
};

export async function listUsuarios(filters: UsuarioFilters = {}) {
  const where: SQL[] = [];
  if (filters.rol) where.push(eq(usuarios.rol, filters.rol));
  if (filters.concesionarioId)
    where.push(eq(usuarios.concesionarioId, filters.concesionarioId));
  if (filters.estado === "inactivo") where.push(eq(usuarios.activo, false));
  if (filters.estado === "activo")
    where.push(and(eq(usuarios.activo, true), tienePassword)!);
  if (filters.estado === "pendiente")
    where.push(and(eq(usuarios.activo, true), sql`not ${tienePassword}`)!);

  return db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      ultimoIngreso: usuarios.ultimoIngreso,
      tienePassword,
      concesionarioId: usuarios.concesionarioId,
      concesionarioNombre: concesionarios.nombre,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(and(...where))
    .orderBy(asc(usuarios.nombre));
}

export type UsuarioListItem = Awaited<ReturnType<typeof listUsuarios>>[number];

export async function getUsuario(id: string) {
  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      ultimoIngreso: usuarios.ultimoIngreso,
      creadoEn: usuarios.creadoEn,
      tienePassword,
      concesionarioId: usuarios.concesionarioId,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id));
  return row ?? null;
}

export function estadoUsuario(u: {
  activo: boolean;
  tienePassword: boolean;
}): EstadoUsuario {
  if (!u.activo) return "inactivo";
  return u.tienePassword ? "activo" : "pendiente";
}

export async function listConcesionarios() {
  return db
    .select({
      id: concesionarios.id,
      nombre: concesionarios.nombre,
      localidad: concesionarios.localidad,
      provincia: concesionarios.provincia,
      activo: concesionarios.activo,
      cantidadUsuarios: sql<number>`(select count(*)::int from usuarios u where u.concesionario_id = ${concesionarios.id})`,
    })
    .from(concesionarios)
    .orderBy(asc(concesionarios.nombre));
}

export async function getConcesionario(id: string) {
  const [row] = await db
    .select()
    .from(concesionarios)
    .where(eq(concesionarios.id, id));
  return row ?? null;
}

/** Cierra todas las sesiones de un usuario (al desactivarlo). */
export async function revokeSesionesUsuario(usuarioId: string) {
  await db.delete(sesiones).where(eq(sesiones.userId, usuarioId));
}

/** Cierra las sesiones de todos los usuarios de un concesionario (al desactivarlo). */
export async function revokeSesionesConcesionario(concesionarioId: string) {
  await db.execute(sql`
    DELETE FROM sesiones
    WHERE user_id IN (SELECT id FROM usuarios WHERE concesionario_id = ${concesionarioId})
  `);
}
