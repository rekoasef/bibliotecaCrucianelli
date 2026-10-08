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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
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
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset active:bg-accent",
                  active && "text-brand-strong",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand/10",
                  )}
                >
                  <Icon
                    aria-hidden
                    className="size-6"
                    strokeWidth={active ? 2.25 : 2}
                  />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
