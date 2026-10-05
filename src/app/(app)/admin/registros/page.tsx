import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
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
import {
  ACCESOS_LIMIT,
  busquedasSinResultados,
  listAccesos,
  type AccesosFilters,
} from "@/db/queries/registros";
import { listConcesionarios, listUsuarios } from "@/db/queries/usuarios";
import { cn } from "@/lib/utils";
import { formatFecha, PageHeader } from "../ui";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Registros" };

const ACCION = {
  ver: "Vio",
  descargar: "Descargó",
  video: "Reprodujo video",
} as const;

export default async function RegistrosPage({
  searchParams,
}: PageProps<"/admin/registros">) {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "busquedas" ? "busquedas" : "accesos";

  return (
    <>
      <PageHeader title="Registros" />
      <nav aria-label="Registros" className="-mx-4 mb-5 overflow-x-auto px-4">
        <ul className="flex gap-1 border-b">
          {(
            [
              ["accesos", "Accesos a documentos"],
              ["busquedas", "Búsquedas sin resultados"],
            ] as const
          ).map(([id, label]) => (
            <li key={id} className="shrink-0">
              <Link
                href={`/admin/registros?tab=${id}`}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center border-b-2 border-transparent px-3 font-medium text-muted-foreground hover:text-foreground",
                  tab === id && "border-brand text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {tab === "accesos" ? <Accesos sp={sp} /> : <Busquedas />}
    </>
  );
}

async function Accesos({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const [usuarios, concesionarios] = await Promise.all([
    listUsuarios(),
    listConcesionarios(),
  ]);
  const fecha = z.iso.date().optional().catch(undefined);
  const filters: AccesosFilters = {
    usuarioId: usuarios.find((u) => u.id === sp.usuario)?.id,
    concesionarioId: concesionarios.find((c) => c.id === sp.concesionario)?.id,
    documento:
      typeof sp.documento === "string" && sp.documento
        ? sp.documento.slice(0, 100)
        : undefined,
    desde: fecha.parse(sp.desde),
    hasta: fecha.parse(sp.hasta),
  };
  const rows = await listAccesos(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="tab" value="accesos" />
        <div className="flex flex-col gap-2">
          <Label htmlFor="r-usuario">Usuario</Label>
          <NativeSelect
            id="r-usuario"
            name="usuario"
            defaultValue={filters.usuarioId ?? ""}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="r-conc">Concesionario</Label>
          <NativeSelect
            id="r-conc"
            name="concesionario"
            defaultValue={filters.concesionarioId ?? ""}
          >
            <option value="">Todos</option>
            {concesionarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="r-doc">Documento</Label>
          <Input
            id="r-doc"
            name="documento"
            type="search"
            defaultValue={filters.documento}
            placeholder="Título"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="r-desde">Desde</Label>
          <Input
            id="r-desde"
            name="desde"
            type="date"
            defaultValue={filters.desde}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="r-hasta">Hasta</Label>
          <Input
            id="r-hasta"
            name="hasta"
            type="date"
            defaultValue={filters.hasta}
          />
        </div>
        <div className="flex gap-2 self-end">
          <Button type="submit" variant="secondary" className="flex-1">
            Filtrar
          </Button>
          {hasFilters && (
            <Button asChild variant="ghost">
              <Link href="/admin/registros?tab=accesos">Limpiar</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="text-muted-foreground">
        {rows.length === ACCESOS_LIMIT
          ? `Se muestran los ${ACCESOS_LIMIT} más recientes. Filtrá para ver otros.`
          : `${rows.length} accesos`}
      </p>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">
                    {formatFecha(r.creadoEn)}
                  </TableCell>
                  <TableCell>
                    {r.usuarioNombre}
                    <div className="text-sm text-muted-foreground">
                      {r.concesionarioNombre ?? "Fábrica"}
                    </div>
                  </TableCell>
                  <TableCell>{ACCION[r.accion]}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    <Link
                      href={`/admin/documentos/${r.documentoId}`}
                      className="font-medium text-brand-strong hover:underline"
                    >
                      {r.documentoTitulo ?? "Sin título"}
                    </Link>
                    {r.archivoNombre && (
                      <div className="text-sm text-muted-foreground">
                        {r.archivoNombre}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

async function Busquedas() {
  const rows = await busquedasSinResultados(90, 200);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Últimos 90 días. Sirven para ajustar títulos, etiquetas y taxonomía, o
        para detectar documentación que falta cargar.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          No hubo búsquedas sin resultados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Texto buscado</TableHead>
                <TableHead className="text-right">Veces</TableHead>
                <TableHead>Última vez</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.texto}>
                  <TableCell className="font-medium whitespace-normal">
                    {r.texto}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.veces}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatFecha(new Date(r.ultima))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
