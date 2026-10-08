import Link from "next/link";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

/** Últimas búsquedas del usuario como accesos directos (un toque, sin tipear). */
export function RecentSearches({
  searches,
  className,
  tone = "default",
}: {
  searches: string[];
  className?: string;
  /** "franja": sobre el rojo de la cabecera. */
  tone?: "default" | "franja";
}) {
  const franja = tone === "franja";
  if (searches.length === 0) return null;

  return (
    <nav aria-labelledby="titulo-busquedas-recientes" className={className}>
      <h2
        id="titulo-busquedas-recientes"
        className={cn(
          "mb-2 flex items-center gap-1.5 text-sm font-semibold",
          franja ? "text-white" : "text-muted-foreground",
        )}
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
                "flex min-h-11 max-w-full items-center truncate rounded-full border px-4 font-medium transition-colors focus-visible:outline-none",
                franja
                  ? "border-white/70 text-white hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/70 active:bg-white/15"
                  : "bg-card hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-accent",
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
