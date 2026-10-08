import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DobleTrazo } from "@/components/brand/doble-trazo";

/**
 * Fila de una línea de sembradoras, con el nombre en mayúsculas como la calco
 * de la máquina. Va dentro de una lista con separadores (`LineaList`).
 */
export function LineaRow({
  href,
  nombre,
  detalle,
  foto,
}: {
  href: string;
  nombre: string;
  /** Modelos de la línea u otra aclaración corta. */
  detalle?: string;
  /** URL de la foto de la línea, si tiene. */
  foto?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset active:bg-secondary"
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- servida por /api/lineas/[id]/foto
          <img
            src={foto}
            alt=""
            loading="lazy"
            width={80}
            height={60}
            className="h-15 w-20 shrink-0 rounded-md bg-muted object-cover"
          />
        ) : (
          <DobleTrazo className="h-5 w-4" />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-xl leading-tight font-extrabold tracking-wide uppercase">
            {nombre}
          </span>
          {detalle && (
            <span className="truncate text-sm text-muted-foreground">
              {detalle}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          className="size-6 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  );
}

/** Lista de líneas de un segmento: panel blanco con separadores. */
export function LineaList({
  segmento,
  headingLevel = 3,
  children,
}: {
  segmento: string;
  headingLevel?: 2 | 3;
  children: React.ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className="flex flex-col gap-2">
      <Heading className="px-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
        {segmento}
      </Heading>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {children}
      </ul>
    </section>
  );
}
