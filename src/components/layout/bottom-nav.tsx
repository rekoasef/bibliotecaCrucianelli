"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItems, isActive, type NavMode } from "./nav-items";

// Navegación principal en celular: al alcance del pulgar, con ícono y texto.
export function BottomNav({ mode }: { mode: NavMode }) {
  const pathname = usePathname();
  const navItems = getNavItems(mode);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 bg-slate pb-[env(safe-area-inset-bottom)] text-white md:hidden"
    >
      <ul
        className={cn(
          "grid h-(--bottom-nav-height)",
          navItems.length === 5 ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-on-slate-muted transition-colors focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none focus-visible:ring-inset active:bg-slate-raised",
                  active && "font-bold text-white",
                )}
              >
                {/* Lo activo: barra roja arriba, inclinada como el trazo del isotipo. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-1 -skew-x-[22deg] bg-brand"
                  />
                )}
                <Icon
                  aria-hidden
                  className="size-6"
                  strokeWidth={active ? 2.5 : 2}
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
