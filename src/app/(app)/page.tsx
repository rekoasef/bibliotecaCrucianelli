import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { tipoIcon } from "@/components/tipo-icon";
import {
  getSegmentosActivosConLineas,
  listTiposActivos,
} from "@/db/queries/taxonomia";

export default async function HomePage() {
  const [segmentos, tipos] = await Promise.all([
    getSegmentosActivosConLineas(),
    listTiposActivos(),
  ]);

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <section aria-labelledby="titulo-buscar" className="flex flex-col gap-4">
        <h1
          id="titulo-buscar"
          className="text-2xl font-bold tracking-tight md:text-4xl"
        >
          ¿Qué documentación necesitás?
        </h1>
        <SearchForm size="lg" autoFocusOnDesktop className="max-w-3xl" />
        <p className="text-sm text-muted-foreground">
          Buscá por máquina, tema o lo que diga el documento. Por ejemplo:{" "}
          <Link
            href="/buscar?q=gringa+v+despiece"
            className="font-medium text-brand-strong underline underline-offset-4"
          >
            gringa v despiece
          </Link>
        </p>
      </section>

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
        <div className="grid gap-4 md:grid-cols-2">
          {segmentos.map((segmento) => (
            <div key={segmento.id} className="rounded-xl border bg-card p-2">
              <h3 className="px-3 pt-2 pb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {segmento.nombre}
              </h3>
              <ul>
                {segmento.lineas.map((linea) => (
                  <li key={linea.slug}>
                    <Link
                      href={`/maquinas/${linea.slug}`}
                      className="flex min-h-12 items-center justify-between rounded-lg px-3 text-lg font-semibold transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-secondary"
                    >
                      {linea.nombre}
                      <ChevronRight
                        aria-hidden
                        className="size-5 text-muted-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-tipos" className="flex flex-col gap-4">
        <SectionTitle id="titulo-tipos">Por tipo de documento</SectionTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tipos.map(({ nombre: label, slug }) => {
            const Icon = tipoIcon(slug);
            return (
              <li key={slug}>
                <Link
                  href={`/buscar?tipo=${slug}`}
                  className="flex h-full min-h-24 flex-col justify-between gap-3 rounded-xl border bg-card p-4 font-semibold transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent"
                >
                  <Icon aria-hidden className="size-6 text-brand-strong" />
                  <span className="leading-tight">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="titulo-recientes"
        className="flex flex-col gap-4"
      >
        <SectionTitle id="titulo-recientes">Últimos publicados</SectionTitle>
        {/* TODO(Fase 4): últimos documentos visibles para el usuario. */}
        <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          <FileText aria-hidden className="size-6 shrink-0" />
          <p>Todavía no hay documentos publicados.</p>
        </div>
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
      <h2 id={id} className="text-xl font-bold tracking-tight md:text-2xl">
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
