"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavItems, isActive } from "./nav-items";

export function DesktopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

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
                  "relative flex h-11 items-center gap-2 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active &&
                    "text-foreground after:absolute after:inset-x-3 after:-bottom-[7px] after:h-0.5 after:rounded-full after:bg-brand",
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
