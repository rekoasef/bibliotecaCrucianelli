/**
 * Pausa por inactividad (docs/01): una cuenta que no usa la app durante
 * `INACTIVIDAD_DIAS` días queda pausada y solo el admin la vuelve a habilitar.
 *
 * No aplica al admin (no podría reactivarse a sí mismo) ni a quien nunca
 * ingresó (para eso está el vencimiento de la invitación).
 *
 * @module
 */

import { sql } from "drizzle-orm";
import { usuarios, type RolUsuario } from "@/db/schema";

/** Campos de `usuarios` que intervienen en el cálculo de inactividad. */
type Actividad = {
  rol: RolUsuario;
  ultimaActividad: Date | null;
  ultimoIngreso: Date | null;
};

/**
 * Si la cuenta superó el plazo de inactividad.
 *
 * @param u - Rol y fechas de última actividad e ingreso.
 * @param dias - Plazo en días; `0` desactiva la pausa.
 * @param ahora - Momento de referencia.
 * @returns `true` si pasaron más de `dias` días desde la última actividad o
 *   ingreso.
 */
export function superaInactividad(u: Actividad, dias: number, ahora: Date) {
  if (u.rol === "admin" || dias <= 0) return false;
  const ultima = Math.max(
    u.ultimaActividad?.getTime() ?? 0,
    u.ultimoIngreso?.getTime() ?? 0,
  );
  if (ultima === 0) return false;
  return ahora.getTime() - ultima > dias * 24 * 60 * 60 * 1000;
}

/**
 * Lo mismo que {@link superaInactividad} más la marca guardada (`pausado_en`),
 * en SQL, para los listados del admin.
 *
 * @param dias - Plazo en días; `0` considera solo la marca guardada.
 * @returns Expresión booleana para usar en un `select` o `where`.
 */
export function pausadoSql(dias: number) {
  if (dias <= 0) return sql<boolean>`(${usuarios.pausadoEn} IS NOT NULL)`;
  return sql<boolean>`(
    ${usuarios.pausadoEn} IS NOT NULL OR (
      ${usuarios.rol} <> 'admin'
      AND greatest(${usuarios.ultimaActividad}, ${usuarios.ultimoIngreso})
          < now() - make_interval(days => ${dias})
    )
  )`;
}

/** Cada cuánto se actualiza `ultima_actividad` (no en cada request). */
export const ACTIVIDAD_INTERVALO_MS = 60 * 60 * 1000;
