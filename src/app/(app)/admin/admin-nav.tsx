"use client";

import {
  Building2,
  FileText,
  FolderInput,
  LayoutDashboard,
  Tags,
  Tractor,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/documentos", label: "Documentos", icon: FileText },
  { href: "/admin/drive", label: "Drive", icon: FolderInput },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/concesionarios", label: "Concesionarios", icon: Building2 },
  { href: "/admin/maquinas", label: "Máquinas", icon: Tractor },
  { href: "/admin/taxonomia", label: "Taxonomía", icon: Tags },
];

// Menú lateral en escritorio; pestañas con scroll horizontal en celular.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Administración"
      className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-lg px-3 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active &&
                    "bg-card text-foreground shadow-xs ring-1 ring-border",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-5", active && "text-brand-strong")}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
