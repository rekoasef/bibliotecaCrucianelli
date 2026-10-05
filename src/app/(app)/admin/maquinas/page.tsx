import { ChevronRight, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getArbolMaquinas } from "@/db/queries/taxonomia";
import { MoveButtons } from "../move-buttons";
import { InactivoBadge, PageHeader } from "../ui";
import { moveMaquina } from "./actions";

export const metadata: Metadata = { title: "Máquinas" };

export default async function MaquinasPage() {
  const arbol = await getArbolMaquinas();

  return (
    <>
      <PageHeader
        title="Máquinas"
        description="Segmento → línea → modelo. Lo inactivo no lo ven fábrica ni concesionarios."
        actions={
          <Button asChild>
            <Link href="/admin/maquinas/segmentos/nuevo">
              <Plus aria-hidden className="size-5" />
              Nuevo segmento
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {arbol.map((segmento, i) => (
          <section
            key={segmento.id}
            aria-labelledby={`seg-${segmento.id}`}
            className="rounded-xl border bg-card"
          >
            <div className="flex items-center gap-2 border-b py-2 pr-2 pl-5">
              <h2
                id={`seg-${segmento.id}`}
                className="flex-1 text-lg font-bold"
              >
                {segmento.nombre}
                {!segmento.activo && <InactivoBadge className="ml-2" />}
              </h2>
              <MoveButtons
                action={moveMaquina}
                fields={{ nivel: "segmentos", id: segmento.id }}
                label={segmento.nombre}
                isFirst={i === 0}
                isLast={i === arbol.length - 1}
              />
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={`Editar ${segmento.nombre}`}
              >
                <Link href={`/admin/maquinas/segmentos/${segmento.id}`}>
                  <Pencil aria-hidden className="size-5" />
                </Link>
              </Button>
            </div>

            <ul className="flex flex-col p-2">
              {segmento.lineas.map((linea, j) => (
                <li key={linea.id} className="flex items-center gap-1">
                  <Link
                    href={`/admin/maquinas/lineas/${linea.id}`}
                    className="flex min-h-12 flex-1 items-center justify-between gap-3 rounded-lg px-3 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold">{linea.nombre}</span>
                      <span className="text-sm text-muted-foreground">
                        {linea.cantidadModelos === 1
                          ? "1 modelo"
                          : `${linea.cantidadModelos} modelos`}
                      </span>
                      {!linea.activo && <InactivoBadge />}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                  <MoveButtons
                    action={moveMaquina}
                    fields={{ nivel: "lineas", id: linea.id }}
                    label={linea.nombre}
                    isFirst={j === 0}
                    isLast={j === segmento.lineas.length - 1}
                  />
                </li>
              ))}
              {segmento.lineas.length === 0 && (
                <li className="px-3 py-2 text-muted-foreground">Sin líneas.</li>
              )}
            </ul>
            <div className="border-t p-2">
              <Button asChild variant="ghost">
                <Link
                  href={`/admin/maquinas/lineas/nuevo?segmento=${segmento.id}`}
                >
                  <Plus aria-hidden className="size-5" />
                  Agregar línea
                </Link>
              </Button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
