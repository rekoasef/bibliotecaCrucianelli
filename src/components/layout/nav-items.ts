import {
  CircleUser,
  House,
  LogIn,
  Search,
  Settings,
  Tractor,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const baseItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/maquinas", label: "Máquinas", icon: Tractor },
];

const cuentaItem: NavItem = {
  href: "/cuenta",
  label: "Cuenta",
  icon: CircleUser,
};
// Clientes finales navegan sin cuenta; concesionarios y fábrica ingresan desde acá.
const ingresarItem: NavItem = {
  href: "/login",
  label: "Ingresar",
  icon: LogIn,
};
const adminItem: NavItem = { href: "/admin", label: "Admin", icon: Settings };

export type NavMode = "cliente" | "usuario" | "admin";

// Mostrar "Admin" es solo comodidad: el acceso real lo valida `requireAdmin` en el servidor.
export function getNavItems(mode: NavMode) {
  if (mode === "cliente") return [...baseItems, ingresarItem];
  if (mode === "admin") return [...baseItems, cuentaItem, adminItem];
  return [...baseItems, cuentaItem];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
