import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getSearchOptions } from "@/lib/search/options";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { isNotNull } from "drizzle-orm";

export const metadata: Metadata = { title: "Máquinas" };

export default async function MaquinasPage() {
  const user = await requireUser();
  const [{ maquinas }, conFoto] = await Promise.all([
    getSearchOptions(user),
    db
      .select({ id: lineas.id })
      .from(lineas)
      .where(isNotNull(lineas.imagenDriveFileId)),
  ]);
  const fotos = new Set(conFoto.map((l) => l.id));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Máquinas
      </h1>
      {maquinas.map((s) => (
        <section key={s.segmento} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {s.segmento}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.lineas.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/maquinas/${l.slug}`}
                  className="flex h-full items-center gap-4 overflow-hidden rounded-xl border bg-card pr-4 transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent"
                >
                  {fotos.has(l.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- servida por /api/lineas/[id]/foto
                    <img
                      src={`/api/lineas/${l.id}/foto`}
                      alt=""
                      loading="lazy"
                      width={112}
                      height={84}
                      className="h-21 w-28 shrink-0 bg-muted object-cover"
                    />
                  ) : (
                    <span aria-hidden className="h-21 w-2 shrink-0 bg-brand" />
                  )}
                  <span className="flex flex-1 flex-col py-4">
                    <span className="text-lg font-semibold">{l.nombre}</span>
                    {l.modelos.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {l.modelos.map((m) => m.nombre).join(", ")}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
