import {
  CircleUser,
  House,
  Search,
  Tractor,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/maquinas", label: "Máquinas", icon: Tractor },
  { href: "/cuenta", label: "Cuenta", icon: CircleUser },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
