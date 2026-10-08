import type { Metadata } from "next";
import { Franja } from "@/components/layout/franja";
import { LineaList, LineaRow } from "@/components/maquinas/linea-row";
import { getViewer } from "@/lib/auth/session";
import { getSearchOptions } from "@/lib/search/options";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { isNotNull } from "drizzle-orm";

export const metadata: Metadata = { title: "Máquinas" };

export default async function MaquinasPage() {
  const { viewer } = await getViewer();
  const [{ maquinas }, conFoto] = await Promise.all([
    getSearchOptions(viewer),
    db
      .select({ id: lineas.id })
      .from(lineas)
      .where(isNotNull(lineas.imagenDriveFileId)),
  ]);
  const fotos = new Set(conFoto.map((l) => l.id));

  return (
    <div className="flex flex-col gap-8">
      <Franja>
        <h1 className="font-display text-[1.75rem] leading-tight font-extrabold md:text-4xl">
          Máquinas
        </h1>
        <p className="mt-1 text-white">
          Elegí la línea para ver toda su documentación.
        </p>
      </Franja>
      <div className="grid gap-6 md:grid-cols-2">
        {maquinas.map((s) => (
          <LineaList key={s.segmento} segmento={s.segmento} headingLevel={2}>
            {s.lineas.map((l) => (
              <LineaRow
                key={l.slug}
                href={`/maquinas/${l.slug}`}
                nombre={l.nombre}
                detalle={
                  l.modelos.length > 0
                    ? l.modelos.map((m) => m.nombre).join(", ")
                    : undefined
                }
                foto={fotos.has(l.id) ? `/api/lineas/${l.id}/foto` : undefined}
              />
            ))}
          </LineaList>
        ))}
      </div>
    </div>
  );
}
