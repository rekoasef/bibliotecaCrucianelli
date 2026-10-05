import type { RolUsuario } from "@/db/schema";

export const ROL_LABEL: Record<RolUsuario, string> = {
  admin: "Administrador",
  fabrica: "Fábrica",
  concesionario: "Concesionario",
};
