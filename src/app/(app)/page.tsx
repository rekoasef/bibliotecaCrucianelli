import Link from "next/link";
import { FileText } from "lucide-react";
import { Franja } from "@/components/layout/franja";
import { LineaList, LineaRow } from "@/components/maquinas/linea-row";
import { ResultCard } from "@/components/search/result-card";
import { RecentSearches } from "@/components/search/recent-searches";
import { SearchForm } from "@/components/search/search-form";
import { TipoIcon } from "@/components/tipo-icon";
import { getViewer } from "@/lib/auth/session";
import { latestDocuments, recentSearches } from "@/lib/search/search";
import {
  getSegmentosActivosConLineas,
  listTiposActivos,
} from "@/db/queries/taxonomia";

export default async function HomePage() {
  const { user, viewer } = await getViewer();
  const [segmentos, tipos, recientes, busquedas] = await Promise.all([
    getSegmentosActivosConLineas(),
    listTiposActivos(),
    latestDocuments(viewer, 6),
    // Los clientes sin cuenta no tienen historial propio.
    user ? recentSearches(user.id) : [],
  ]);

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <Franja>
        <section
          aria-labelledby="titulo-buscar"
          className="flex flex-col gap-4"
        >
          <h1
            id="titulo-buscar"
            className="max-w-[16ch] font-display text-[1.75rem] leading-[1.1] font-extrabold md:max-w-[22ch] md:text-5xl"
          >
            ¿Qué documentación necesitás?
          </h1>
          <SearchForm
            size="lg"
            tone="franja"
            autoFocusOnDesktop
            className="max-w-3xl"
          />
          {busquedas.length > 0 ? (
            <RecentSearches
              searches={busquedas}
              tone="franja"
              className="max-w-3xl"
            />
          ) : (
            <p className="text-white">
              Buscá por máquina, tema o lo que diga el documento. Por ejemplo:{" "}
              <Link
                href="/buscar?q=gringa+v+despiece"
                className="font-bold underline decoration-2 underline-offset-4"
              >
                gringa v despiece
              </Link>
            </p>
          )}
        </section>
      </Franja>

      <section
        aria-labelledby="titulo-maquinas"
        className="flex flex-col gap-4"
      >
        <SectionTitle
          id="titulo-maquinas"
          href="/maquinas"
          linkLabel="Ver todas"
        >
          Por máquina
        </SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          {segmentos.map((segmento) => (
            <LineaList key={segmento.id} segmento={segmento.nombre}>
              {segmento.lineas.map((linea) => (
                <LineaRow
                  key={linea.slug}
                  href={`/maquinas/${linea.slug}`}
                  nombre={linea.nombre}
                />
              ))}
            </LineaList>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-tipos" className="flex flex-col gap-4">
        <SectionTitle id="titulo-tipos">Por tipo de documento</SectionTitle>
        <ul className="flex flex-wrap gap-2">
          {tipos.map(({ nombre: label, slug }) => (
            <li key={slug}>
              <Link
                href={`/buscar?tipo=${slug}`}
                className="flex min-h-12 items-center gap-2 rounded-full border bg-card pr-4 pl-3 font-semibold transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent"
              >
                <TipoIcon
                  slug={slug}
                  className="size-5 shrink-0 text-brand-strong"
                />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="titulo-recientes"
        className="flex flex-col gap-4"
      >
        <SectionTitle id="titulo-recientes">Últimos publicados</SectionTitle>
        {recientes.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {recientes.map((r) => (
              <li key={r.id}>
                <ResultCard result={r} compact />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
            <FileText aria-hidden className="size-6 shrink-0" />
            <p>Todavía no hay documentos publicados.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({
  id,
  children,
  href,
  linkLabel,
}: {
  id: string;
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2
        id={id}
        className="font-display text-xl font-extrabold tracking-tight md:text-2xl"
      >
        {children}
      </h2>
      {href && (
        <Link
          href={href}
          className="-my-2 flex min-h-11 items-center font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
