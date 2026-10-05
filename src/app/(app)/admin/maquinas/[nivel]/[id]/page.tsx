import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  getLinea,
  getModelo,
  getSegmento,
  listLineasConSegmento,
  listModelosDeLinea,
  listSegmentos,
} from "@/db/queries/taxonomia";
import { NIVELES, type Nivel } from "@/lib/validation/taxonomia";
import { ActivoPanel } from "../../../activo-panel";
import { MoveButtons } from "../../../move-buttons";
import { InactivoBadge, PageHeader, Panel } from "../../../ui";
import { moveMaquina, setMaquinaActivo } from "../../actions";
import { MaquinaForm } from "./maquina-form";

export const metadata: Metadata = { title: "Máquinas" };

const NOMBRE: Record<Nivel, { singular: string; nuevo: string }> = {
  segmentos: { singular: "segmento", nuevo: "Nuevo segmento" },
  lineas: { singular: "línea", nuevo: "Nueva línea" },
  modelos: { singular: "modelo", nuevo: "Nuevo modelo" },
};

const DESACTIVAR: Record<Nivel, string> = {
  segmentos:
    "Fábrica y concesionarios dejan de ver el segmento, sus líneas y modelos, y los documentos asociados solo a ellos.",
  lineas:
    "Fábrica y concesionarios dejan de ver la línea, sus modelos y los documentos asociados solo a ellos.",
  modelos:
    "Fábrica y concesionarios dejan de ver el modelo y los documentos asociados solo a él.",
};

const back = { href: "/admin/maquinas", label: "Máquinas" };

export default async function MaquinaPage({
  params,
  searchParams,
}: PageProps<"/admin/maquinas/[nivel]/[id]">) {
  const { nivel: rawNivel, id } = await params;
  const sp = await searchParams;
  const nivel = z.enum(NIVELES).safeParse(rawNivel).data;
  if (!nivel) notFound();
  const esNuevo = id === "nuevo";
  if (!esNuevo && !z.uuid().safeParse(id).success) notFound();
  const { singular, nuevo } = NOMBRE[nivel];

  // Opciones de padre para líneas (segmentos) y modelos (líneas).
  const parentOptions =
    nivel === "lineas"
      ? (await listSegmentos()).map((s) => ({ id: s.id, label: s.nombre }))
      : nivel === "modelos"
        ? (await listLineasConSegmento()).map((l) => ({
            id: l.id,
            label: `${l.nombre} (${l.segmentoNombre})`,
          }))
        : undefined;
  const parentParam = typeof sp.segmento === "string" ? sp.segmento : sp.linea;
  const defaultParentId =
    typeof parentParam === "string" &&
    parentOptions?.some((o) => o.id === parentParam)
      ? parentParam
      : undefined;

  if (esNuevo) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={nuevo} back={back} />
        <Panel>
          <MaquinaForm
            nivel={nivel}
            parentOptions={parentOptions}
            defaultParentId={defaultParentId}
          />
        </Panel>
      </div>
    );
  }

  const item =
    nivel === "segmentos"
      ? await getSegmento(id)
      : nivel === "lineas"
        ? await getLinea(id)
        : await getModelo(id);
  if (!item) notFound();

  const parentId: string | undefined =
    "segmentoId" in item
      ? (item.segmentoId as string)
      : "lineaId" in item
        ? (item.lineaId as string)
        : undefined;
  const modelos = nivel === "lineas" ? await listModelosDeLinea(id) : [];

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader
        title={item.nombre}
        description={`${singular[0].toUpperCase()}${singular.slice(1)}`}
        back={
          nivel === "modelos" && parentId
            ? { href: `/admin/maquinas/lineas/${parentId}`, label: "Línea" }
            : back
        }
        actions={
          !item.activo && <InactivoBadge className="h-7 px-2.5 text-sm" />
        }
      />
      {sp.creado && (
        <FormMessage
          state={{
            success: `Se creó ${nivel === "lineas" ? "la" : "el"} ${singular}.`,
          }}
        />
      )}

      {nivel === "lineas" && (
        <Panel title={`Modelos (${modelos.length})`}>
          {modelos.length === 0 ? (
            <p className="text-muted-foreground">
              Sin modelos: los documentos se asocian a la línea completa.
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {modelos.map((m, i) => (
                <li key={m.id} className="flex items-center gap-1">
                  <Link
                    href={`/admin/maquinas/modelos/${m.id}`}
                    className="flex min-h-12 flex-1 flex-wrap items-center gap-x-2 rounded-lg px-2 hover:bg-accent"
                  >
                    <span className="font-semibold">{m.nombre}</span>
                    {!m.activo && <InactivoBadge />}
                  </Link>
                  <MoveButtons
                    action={moveMaquina}
                    fields={{ nivel: "modelos", id: m.id }}
                    label={m.nombre}
                    isFirst={i === 0}
                    isLast={i === modelos.length - 1}
                  />
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="self-start">
            <Link href={`/admin/maquinas/modelos/nuevo?linea=${id}`}>
              <Plus aria-hidden className="size-5" />
              Agregar modelo
            </Link>
          </Button>
        </Panel>
      )}

      <Panel title="Datos">
        <MaquinaForm
          nivel={nivel}
          item={{ ...item, parentId }}
          parentOptions={parentOptions}
        />
      </Panel>

      <ActivoPanel
        action={setMaquinaActivo}
        fields={{ nivel, id }}
        activo={item.activo}
        nombre={singular}
        descripcionDesactivar={DESACTIVAR[nivel]}
        descripcionReactivar="Vuelve a estar visible para fábrica y concesionarios."
      />
    </div>
  );
}
