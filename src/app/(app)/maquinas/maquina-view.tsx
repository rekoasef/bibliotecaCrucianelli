import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ResultCard } from "@/components/search/result-card";
import { SearchForm } from "@/components/search/search-form";
import { TipoIcon } from "@/components/tipo-icon";
import type { CurrentUser } from "@/lib/auth/session";
import type { MaquinaOpcion } from "@/lib/search/options";
import { searchDocuments, type SearchResult } from "@/lib/search/search";
import { cn } from "@/lib/utils";

type Linea = MaquinaOpcion["lineas"][number];

/**
 * Página de una línea o de un modelo (docs/05): encabezado, selector de modelo,
 * buscador acotado y documentos agrupados por tipo.
 */
export async function MaquinaView({
  user,
  linea,
  modelo,
  tieneFoto,
}: {
  user: CurrentUser;
  linea: Linea;
  modelo?: { nombre: string; slug: string };
  tieneFoto: boolean;
}) {
  const { results } = await searchDocuments(
    modelo ? { modelo: modelo.slug } : { linea: linea.slug },
    user,
    500,
  );
  const nombre = modelo?.nombre ?? linea.nombre;

  // Agrupar por tipo, respetando el orden de los resultados.
  const grupos = new Map<
    string,
    { slug: string | null; docs: SearchResult[] }
  >();
  for (const r of results) {
    const key = r.tipoNombre ?? "Otros";
    if (!grupos.has(key)) grupos.set(key, { slug: r.tipoSlug, docs: [] });
    grupos.get(key)!.docs.push(r);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={modelo ? `/maquinas/${linea.slug}` : "/maquinas"}
        className="-mb-2 flex min-h-11 items-center gap-1.5 self-start font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-5" />
        {modelo ? linea.nombre : "Máquinas"}
      </Link>

      <header className="flex items-center gap-4">
        {tieneFoto && (
          // eslint-disable-next-line @next/next/no-img-element -- servida por /api/lineas/[id]/foto
          <img
            src={`/api/lineas/${linea.id}/foto`}
            alt=""
            width={128}
            height={96}
            className="h-24 w-32 shrink-0 rounded-lg border bg-muted object-cover"
          />
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {nombre}
          </h1>
          <p className="text-muted-foreground">
            {results.length === 1
              ? "1 documento"
              : `${results.length} documentos`}
          </p>
        </div>
      </header>

      {linea.modelos.length > 0 && (
        <nav aria-label="Modelos" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            <ModeloChip href={`/maquinas/${linea.slug}`} active={!modelo}>
              Todos los modelos
            </ModeloChip>
            {linea.modelos.map((m) => (
              <ModeloChip
                key={m.slug}
                href={`/maquinas/${linea.slug}/${m.slug}`}
                active={modelo?.slug === m.slug}
              >
                {m.nombre}
              </ModeloChip>
            ))}
          </ul>
        </nav>
      )}

      <SearchForm
        hidden={modelo ? { modelo: modelo.slug } : { linea: linea.slug }}
        placeholder={`Buscar en ${nombre}…`}
        label={`Buscar en ${nombre}`}
        className="max-w-3xl"
      />

      {grupos.size === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          Todavía no hay documentos publicados para {nombre}.
        </p>
      ) : (
        <>
          <nav
            aria-label="Tipos de documento"
            className="-mx-4 overflow-x-auto px-4"
          >
            <ul className="flex gap-2">
              {[...grupos].map(([tipo, g]) => (
                <li key={tipo} className="shrink-0">
                  <a
                    href={`#tipo-${g.slug ?? "otros"}`}
                    className="flex min-h-11 items-center gap-2 rounded-full border bg-card px-3 font-medium hover:border-foreground/30"
                  >
                    {tipo}
                    <span className="rounded-full bg-secondary px-2 text-sm tabular-nums">
                      {g.docs.length}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {[...grupos].map(([tipo, g]) => (
            <section
              key={tipo}
              id={`tipo-${g.slug ?? "otros"}`}
              aria-labelledby={`titulo-${g.slug ?? "otros"}`}
              className="flex scroll-mt-20 flex-col gap-3"
            >
              <h2
                id={`titulo-${g.slug ?? "otros"}`}
                className="flex items-center gap-2 text-xl font-bold"
              >
                {g.slug && (
                  <TipoIcon
                    slug={g.slug}
                    className="size-5 text-brand-strong"
                  />
                )}
                {tipo}
                <span className="text-base font-normal text-muted-foreground">
                  ({g.docs.length})
                </span>
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {g.docs.map((r) => (
                  <li key={r.id}>
                    <ResultCard result={r} compact />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function ModeloChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center rounded-full border bg-card px-4 font-medium hover:border-foreground/30",
          active &&
            "border-foreground bg-foreground text-background hover:border-foreground",
        )}
      >
        {children}
      </Link>
    </li>
  );
}
