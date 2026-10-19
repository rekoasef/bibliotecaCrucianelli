/**
 * Textos de la interfaz para valores de la base.
 *
 * @module
 */

import type { RolUsuario } from "@/db/schema";

/** Nombre de cada rol para mostrar. */
export const ROL_LABEL: Record<RolUsuario, string> = {
  admin: "Administrador",
  fabrica: "Fábrica",
  concesionario: "Concesionario",
};
