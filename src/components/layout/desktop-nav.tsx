"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItems, isActive, type NavMode } from "./nav-items";

export function DesktopNav({ mode }: { mode: NavMode }) {
  const pathname = usePathname();
  const navItems = getNavItems(mode);

  return (
    <nav aria-label="Principal" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-2 rounded-lg px-3 font-medium text-on-slate-muted transition-colors hover:bg-slate-raised hover:text-white focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none",
                  active &&
                    "text-white after:absolute after:inset-x-3 after:-bottom-[10px] after:h-[3px] after:bg-brand",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
