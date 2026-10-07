import Link from "next/link";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

/** Últimas búsquedas del usuario como accesos directos (un toque, sin tipear). */
export function RecentSearches({
  searches,
  className,
}: {
  searches: string[];
  className?: string;
}) {
  if (searches.length === 0) return null;

  return (
    <nav aria-labelledby="titulo-busquedas-recientes" className={className}>
      <h2
        id="titulo-busquedas-recientes"
        className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
      >
        <History aria-hidden className="size-4" />
        Tus búsquedas recientes
      </h2>
      <ul className="flex flex-wrap gap-2">
        {searches.map((q) => (
          <li key={q} className="min-w-0">
            <Link
              href={`/buscar?${new URLSearchParams({ q })}`}
              className={cn(
                "flex min-h-11 max-w-full items-center truncate rounded-full border bg-card px-4 font-medium",
                "transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent",
              )}
            >
              <span className="truncate">{q}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
