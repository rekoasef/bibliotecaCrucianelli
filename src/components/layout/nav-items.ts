import {
  CircleUser,
  House,
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
  { href: "/cuenta", label: "Cuenta", icon: CircleUser },
];

const adminItem: NavItem = { href: "/admin", label: "Admin", icon: Settings };

// Mostrar "Admin" es solo comodidad: el acceso real lo valida `requireAdmin` en el servidor.
export function getNavItems(isAdmin: boolean) {
  return isAdmin ? [...baseItems, adminItem] : baseItems;
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
