/**
 * Ítems de la navegación principal según quién mira.
 *
 * @module
 */

import {
  CircleUser,
  House,
  LogIn,
  Search,
  Settings,
  Tractor,
  type LucideIcon,
} from "lucide-react";

/** Ítem de navegación. */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Ítems para todos: inicio, búsqueda y máquinas. */
const baseItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/maquinas", label: "Máquinas", icon: Tractor },
];

/** "Mi cuenta", para usuarios con sesión. */
const cuentaItem: NavItem = {
  href: "/cuenta",
  label: "Cuenta",
  icon: CircleUser,
};

/**
 * Clientes finales navegan sin cuenta; concesionarios y fábrica ingresan desde
 * acá.
 */
const ingresarItem: NavItem = {
  href: "/login",
  label: "Ingresar",
  icon: LogIn,
};

/** Panel del admin. */
const adminItem: NavItem = { href: "/admin", label: "Admin", icon: Settings };

/** Quién mira: cliente sin sesión, usuario con sesión o admin. */
export type NavMode = "cliente" | "usuario" | "admin";

/**
 * Ítems de navegación para cada modo.
 *
 * @param mode - Quién mira.
 * @remarks Mostrar "Admin" es solo comodidad: el acceso real lo valida
 *   `requireAdmin` en el servidor.
 */
export function getNavItems(mode: NavMode) {
  if (mode === "cliente") return [...baseItems, ingresarItem];
  if (mode === "admin") return [...baseItems, cuentaItem, adminItem];
  return [...baseItems, cuentaItem];
}

/**
 * Si el ítem corresponde a la página actual (el inicio solo en `/`, el resto
 * por prefijo).
 *
 * @param pathname - Ruta actual.
 * @param href - Destino del ítem.
 */
export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
