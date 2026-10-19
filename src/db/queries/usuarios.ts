/**
 * Consultas de usuarios y concesionarios para el admin.
 *
 * @module
 */

import "server-only";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pausadoSql } from "@/lib/auth/inactividad";
import { env } from "@/lib/env";
import {
  concesionarios,
  sesiones,
  usuarios,
  type RolUsuario,
} from "@/db/schema";

/** `true` si el usuario ya definió su contraseña (aceptó la invitación). */
const tienePassword = sql<boolean>`exists (select 1 from cuentas c where c.user_id = ${usuarios.id})`;

/** Estado mostrado en el admin. */
export type EstadoUsuario = "activo" | "inactivo" | "pendiente" | "pausado";

/**
 * Pausado por inactividad (guardado, o ya vencido el plazo aunque no haya
 * vuelto a entrar).
 */
const pausado = () => pausadoSql(env().INACTIVIDAD_DIAS);

/** Último uso de la app: actividad o, para cuentas viejas, último ingreso. */
const ultimoUso = sql<Date | null>`greatest(${usuarios.ultimaActividad}, ${usuarios.ultimoIngreso})`;

/** Filtros del listado de usuarios. */
export type UsuarioFilters = {
  rol?: RolUsuario;
  concesionarioId?: string;
  estado?: EstadoUsuario;
};

/**
 * Usuarios con su estado, por nombre.
 *
 * @param filters - Rol, concesionario y estado.
 */
export async function listUsuarios(filters: UsuarioFilters = {}) {
  const where: SQL[] = [];
  if (filters.rol) where.push(eq(usuarios.rol, filters.rol));
  if (filters.concesionarioId)
    where.push(eq(usuarios.concesionarioId, filters.concesionarioId));
  if (filters.estado === "inactivo") where.push(eq(usuarios.activo, false));
  if (filters.estado === "pausado")
    where.push(and(eq(usuarios.activo, true), pausado())!);
  if (filters.estado === "activo")
    where.push(
      and(eq(usuarios.activo, true), tienePassword, sql`not ${pausado()}`)!,
    );
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
      ultimoUso: ultimoUso.mapWith(usuarios.ultimaActividad),
      tienePassword,
      pausado: pausado(),
      concesionarioId: usuarios.concesionarioId,
      concesionarioNombre: concesionarios.nombre,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(and(...where))
    .orderBy(asc(usuarios.nombre));
}

/** Fila de {@link listUsuarios}. */
export type UsuarioListItem = Awaited<ReturnType<typeof listUsuarios>>[number];

/**
 * Ficha de un usuario para el admin.
 *
 * @param id - ID del usuario.
 * @returns La ficha, o `null`.
 */
export async function getUsuario(id: string) {
  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      ultimoIngreso: usuarios.ultimoIngreso,
      ultimoUso: ultimoUso.mapWith(usuarios.ultimaActividad),
      pausadoEn: usuarios.pausadoEn,
      creadoEn: usuarios.creadoEn,
      tienePassword,
      pausado: pausado(),
      concesionarioId: usuarios.concesionarioId,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id));
  return row ?? null;
}

/**
 * Estado de un usuario: inactivo, pausado, pendiente (sin contraseña) o activo,
 * en ese orden de prioridad.
 *
 * @param u - Datos de {@link listUsuarios} o {@link getUsuario}.
 */
export function estadoUsuario(u: {
  activo: boolean;
  tienePassword: boolean;
  pausado: boolean;
}): EstadoUsuario {
  if (!u.activo) return "inactivo";
  if (u.pausado) return "pausado";
  return u.tienePassword ? "activo" : "pendiente";
}

/** Concesionarios con su cantidad de usuarios, por nombre. */
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

/**
 * Un concesionario.
 *
 * @param id - ID del concesionario.
 * @returns La fila, o `null`.
 */
export async function getConcesionario(id: string) {
  const [row] = await db
    .select()
    .from(concesionarios)
    .where(eq(concesionarios.id, id));
  return row ?? null;
}

/**
 * Cierra todas las sesiones de un usuario (al desactivarlo o cambiar su rol).
 *
 * @param usuarioId - Usuario.
 */
export async function revokeSesionesUsuario(usuarioId: string) {
  await db.delete(sesiones).where(eq(sesiones.userId, usuarioId));
}

/**
 * Cierra las sesiones de todos los usuarios de un concesionario (al
 * desactivarlo).
 *
 * @param concesionarioId - Concesionario.
 */
export async function revokeSesionesConcesionario(concesionarioId: string) {
  await db.execute(sql`
    DELETE FROM sesiones
    WHERE user_id IN (SELECT id FROM usuarios WHERE concesionario_id = ${concesionarioId})
  `);
}
