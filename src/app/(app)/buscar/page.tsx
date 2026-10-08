import { SearchX, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RecentSearches } from "@/components/search/recent-searches";
import { ResultCard } from "@/components/search/result-card";
import { SearchForm } from "@/components/search/search-form";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";
import { getSearchOptions, type SearchOptions } from "@/lib/search/options";
import {
  PAGE_SIZE,
  recentSearches,
  registrarBusqueda,
  searchDocuments,
  type SearchFilters,
} from "@/lib/search/search";
import { FiltersForm } from "./filters-form";
import { FiltersSheet } from "./filters-sheet";

export const metadata: Metadata = { title: "Buscar" };

const FILTER_KEYS = [
  "producto",
  "linea",
  "modelo",
  "tipo",
  "sistema",
  "tema",
  "etiqueta",
] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function str(v: string | string[] | undefined, max = 100) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** URL de /buscar con estos parámetros (sin vacíos). */
function buscarUrl(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `/buscar?${qs}` : "/buscar";
}

export default async function BuscarPage({
  searchParams,
}: PageProps<"/buscar">) {
  const { user, viewer } = await getViewer();
  const sp = await searchParams;

  // El selector "Máquina" del formulario manda maquina=linea:x / modelo:x;
  // se normaliza a la URL canónica (?linea=… o ?modelo=…).
  const maquina = str(sp.maquina);
  if (sp.maquina !== undefined) {
    const [nivel, slug] = maquina?.split(":") ?? [];
    const params: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(sp)) {
      if (k !== "maquina" && k !== "linea" && k !== "modelo" && k !== "pagina")
        params[k] = str(v, 200);
    }
    if (nivel === "linea" || nivel === "modelo") params[nivel] = slug;
    redirect(buscarUrl(params));
  }

  const filters: SearchFilters = {
    q: str(sp.q, 200),
    producto: str(sp.producto),
    linea: str(sp.linea),
    modelo: str(sp.modelo),
    tipo: str(sp.tipo),
    sistema: str(sp.sistema),
    tema: str(sp.tema),
    etiqueta: str(sp.etiqueta),
    obsoletos: sp.obsoletos === "1",
  };
  const pagina = Math.min(Math.max(Number(sp.pagina) || 1, 1), 25);

  const activeFilters = FILTER_KEYS.filter((k) => filters[k]);
  const hayBusqueda = Boolean(filters.q) || activeFilters.length > 0;

  const [options, { total, results, correccion }, busquedas] =
    await Promise.all([
      getSearchOptions(viewer),
      searchDocuments(filters, viewer, pagina * PAGE_SIZE),
      // Sin búsqueda en curso: accesos directos a las últimas.
      hayBusqueda || !user ? [] : recentSearches(user.id),
    ]);
  if (hayBusqueda && pagina === 1) {
    await registrarBusqueda({
      usuarioId: user?.id ?? null,
      filters,
      cantidad: total,
    });
  }

  const current: Record<string, string | undefined> = {
    q: filters.q,
    ...Object.fromEntries(activeFilters.map((k) => [k, filters[k]])),
    obsoletos: filters.obsoletos ? "1" : undefined,
  };
  const exactos = results.filter((r) => !r.aproximado);
  const aproximados = results.filter((r) => r.aproximado);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Buscar documentación</h1>
      <SearchForm
        defaultValue={filters.q}
        hidden={{ ...current, q: undefined }}
        autoFocusOnDesktop={!filters.q}
        className="max-w-3xl"
      />
      <RecentSearches searches={busquedas} className="max-w-3xl" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside
          aria-label="Filtros"
          className="hidden w-72 shrink-0 rounded-xl border bg-card p-4 lg:block"
        >
          <h2 className="mb-3 text-lg font-bold">Filtros</h2>
          <FiltersForm idPrefix="d" options={options} filters={filters} />
        </aside>

        <section
          aria-labelledby="titulo-resultados"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <FiltersSheet
              key={JSON.stringify(current)}
              activeCount={activeFilters.length + (filters.obsoletos ? 1 : 0)}
            >
              <FiltersForm idPrefix="m" options={options} filters={filters} />
            </FiltersSheet>
            {activeFilters.map((k) => (
              <Link
                key={k}
                href={buscarUrl({ ...current, [k]: undefined })}
                aria-label={`Quitar filtro ${chipLabel(k, filters[k]!, options)}`}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 pr-2 pl-3 font-medium hover:bg-brand/10"
              >
                {chipLabel(k, filters[k]!, options)}
                <X aria-hidden className="size-4" />
              </Link>
            ))}
            {filters.obsoletos && (
              <Link
                href={buscarUrl({ ...current, obsoletos: undefined })}
                className="flex min-h-11 items-center gap-1.5 rounded-full border bg-card pr-2 pl-3 font-medium"
              >
                Con obsoletos
                <X aria-hidden className="size-4" />
              </Link>
            )}
            {(activeFilters.length > 0 || filters.obsoletos) && (
              <Link
                href={buscarUrl({ q: filters.q })}
                className="flex min-h-11 items-center px-2 font-medium text-brand-strong underline-offset-4 hover:underline"
              >
                Limpiar filtros
              </Link>
            )}
          </div>

          <h2
            id="titulo-resultados"
            className="font-semibold text-muted-foreground"
            aria-live="polite"
          >
            {total === 0
              ? "Sin resultados"
              : total === 1
                ? "1 resultado"
                : `${total} resultados`}
            {filters.q && (
              <>
                {" "}
                para{" "}
                <span className="text-foreground">
                  «{correccion ?? filters.q}»
                </span>
              </>
            )}
          </h2>
          {correccion && (
            <p className="-mt-2 text-muted-foreground">
              Buscamos «{correccion}» porque «{filters.q}» no aparece en la
              biblioteca.
            </p>
          )}

          {total === 0 ? (
            <EmptyState hayFiltros={activeFilters.length > 0} q={filters.q} />
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {exactos.map((r) => (
                  <li key={r.id}>
                    <ResultCard result={r} />
                  </li>
                ))}
              </ul>
              {aproximados.length > 0 && (
                <>
                  <h3 className="mt-2 font-semibold text-muted-foreground">
                    {exactos.length
                      ? "También puede interesarte"
                      : "Resultados parecidos"}
                    <span className="font-normal">
                      {" "}
                      (revisá cómo está escrito)
                    </span>
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {aproximados.map((r) => (
                      <li key={r.id}>
                        <ResultCard result={r} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {results.length < total && pagina < 25 && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="self-center"
                >
                  <Link
                    href={buscarUrl({ ...current, pagina: String(pagina + 1) })}
                    scroll={false}
                  >
                    Cargar más
                  </Link>
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function chipLabel(key: FilterKey, value: string, o: SearchOptions) {
  const lineas = o.maquinas.flatMap((s) => s.lineas);
  switch (key) {
    case "producto":
      return o.productos.find((t) => t.slug === value)?.nombre ?? value;
    case "linea":
      return lineas.find((l) => l.slug === value)?.nombre ?? value;
    case "modelo":
      return (
        lineas.flatMap((l) => l.modelos).find((m) => m.slug === value)
          ?.nombre ?? value
      );
    case "tipo":
      return o.tipos.find((t) => t.slug === value)?.nombre ?? value;
    case "sistema":
      return o.sistemas.find((t) => t.slug === value)?.nombre ?? value;
    case "tema":
      return o.temas.find((t) => t.slug === value)?.nombre ?? value;
    case "etiqueta":
      return o.etiquetas.find((t) => t.slug === value)?.nombre ?? value;
  }
}

function EmptyState({ hayFiltros, q }: { hayFiltros: boolean; q?: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-card p-5">
      <SearchX aria-hidden className="size-8 text-muted-foreground" />
      <p className="text-lg font-semibold">
        No encontramos documentos{q ? ` para «${q}»` : ""}.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
        {q && <li>Probá con menos palabras o revisá cómo está escrito.</li>}
        {hayFiltros && (
          <li>
            <Link
              href={buscarUrl({ q })}
              className="font-medium text-brand-strong underline"
            >
              Buscar sin filtros
            </Link>
          </li>
        )}
        <li>
          <Link
            href="/maquinas"
            className="font-medium text-brand-strong underline"
          >
            Buscar por máquina
          </Link>
        </li>
      </ul>
    </div>
  );
}
