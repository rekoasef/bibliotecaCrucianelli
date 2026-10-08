import { FolderInput } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { FormMessage } from "@/components/forms/form-message";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCatalogo, listLineasConSegmento } from "@/db/queries/taxonomia";
import { estadoDoc } from "@/db/schema";
import { publicosLabel } from "@/lib/documentos/rules";
import {
  listDocumentosAdmin,
  type DocumentoFilters,
} from "@/lib/documentos/service";
import { formatFecha, PageHeader } from "../ui";
import { EstadoDocBadge } from "./estado-badge";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Documentos" };

const PUBLICO = {
  concesionarios: "Para concesionarios",
  clientes: "Para clientes",
  "solo-fabrica": "Solo fábrica",
} as const;
const ESTADO = {
  borrador: "Borrador",
  vigente: "Vigente",
  obsoleto: "Obsoleto",
} as const;

export default async function DocumentosPage({
  searchParams,
}: PageProps<"/admin/documentos">) {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const sp = await searchParams;
  const [tipos, lineas] = await Promise.all([
    listCatalogo("tipos"),
    listLineasConSegmento(),
  ]);
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

  const filters: DocumentoFilters = {
    q: str(sp.q)?.slice(0, 100),
    estado: z
      .enum(estadoDoc.enumValues)
      .optional()
      .catch(undefined)
      .parse(str(sp.estado)),
    publico: z
      .enum(["concesionarios", "clientes", "solo-fabrica"])
      .optional()
      .catch(undefined)
      .parse(str(sp.publico)),
    tipoId: tipos.find((t) => t.id === sp.tipo)?.id,
    lineaId: lineas.find((l) => l.id === sp.linea)?.id,
    revision: sp.revision === "1",
    problemas: sp.problemas === "1",
  };
  const docs = await listDocumentosAdmin(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  const aviso = sp.creados
    ? `Se crearon ${Number(sp.creados)} borradores. Clasificalos y publicalos.`
    : sp.eliminado
      ? "Borrador eliminado."
      : sp.todos
        ? "Guardado. No quedan más borradores."
        : null;

  return (
    <>
      <PageHeader
        title="Documentos"
        description={`${docs.length} ${hasFilters ? "con estos filtros" : "en total"}`}
        actions={
          <Button asChild>
            <Link href="/admin/drive">
              <FolderInput aria-hidden className="size-5" />
              Incorporar desde Drive
            </Link>
          </Button>
        }
      />
      {aviso && (
        <div className="mb-5">
          <FormMessage state={{ success: aviso }} />
        </div>
      )}

      <form className="mb-5 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="f-q">Título</Label>
          <Input
            id="f-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Buscar por título"
          />
        </div>
        <Filter
          id="f-estado"
          name="estado"
          label="Estado"
          value={filters.estado}
        >
          {Object.entries(ESTADO).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Filter>
        <Filter id="f-tipo" name="tipo" label="Tipo" value={filters.tipoId}>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Filter>
        <Filter
          id="f-linea"
          name="linea"
          label="Máquina"
          value={filters.lineaId}
        >
          {lineas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre} ({l.segmentoNombre})
            </option>
          ))}
        </Filter>
        <Filter
          id="f-vis"
          name="publico"
          label="Visibilidad"
          value={filters.publico}
        >
          {Object.entries(PUBLICO).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Filter>
        <label className="flex min-h-11 items-center gap-3 self-end">
          <input
            type="checkbox"
            name="revision"
            value="1"
            defaultChecked={filters.revision}
            className="size-5 accent-brand"
          />
          Requieren revisión
        </label>
        <label className="flex min-h-11 items-center gap-3 self-end">
          <input
            type="checkbox"
            name="problemas"
            value="1"
            defaultChecked={filters.problemas}
            className="size-5 accent-brand"
          />
          Archivos con problemas
        </label>
        <div className="flex gap-2 self-end">
          <Button type="submit" variant="secondary" className="flex-1">
            Filtrar
          </Button>
          {hasFilters && (
            <Button asChild variant="ghost">
              <Link href="/admin/documentos">Limpiar</Link>
            </Button>
          )}
        </div>
      </form>

      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          {hasFilters
            ? "No hay documentos con estos filtros."
            : "Todavía no hay documentos. Empezá incorporando archivos desde Drive."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead>Actualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="max-w-md whitespace-normal">
                    <Link
                      href={`/admin/documentos/${d.id}`}
                      className="font-semibold text-brand-strong underline-offset-4 hover:underline"
                    >
                      {d.titulo || "Sin título"}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {[
                        d.tipoNombre ?? "Sin tipo",
                        d.cantidadArchivos === 1
                          ? "1 archivo"
                          : `${d.cantidadArchivos} archivos`,
                      ].join(" · ")}
                      {d.requiereRevision && " · requiere revisión"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <EstadoDocBadge estado={d.estado} />
                  </TableCell>
                  <TableCell>{publicosLabel(d)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatFecha(d.actualizadoEn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

function Filter({
  id,
  name,
  label,
  value,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} defaultValue={value ?? ""}>
        <option value="">Todos</option>
        {children}
      </NativeSelect>
    </div>
  );
}
