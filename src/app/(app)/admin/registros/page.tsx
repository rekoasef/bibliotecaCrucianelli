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
  busquedasFrecuentes,
  busquedasSinResultados,
  documentosConsultados,
  listAccesos,
  RECURRENCIA_LIMIT,
  type AccesosFilters,
  type Recurrencia,
} from "@/db/queries/registros";
import { listConcesionarios, listUsuarios } from "@/db/queries/usuarios";
import { cn } from "@/lib/utils";
import { formatFecha, PageHeader } from "../ui";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Registros" };

const TABS = [
  ["accesos", "Accesos a documentos"],
  ["frecuentes", "Búsquedas frecuentes"],
  ["documentos", "Documentos más consultados"],
  ["busquedas", "Búsquedas sin resultados"],
] as const;
type Tab = (typeof TABS)[number][0];

const PERIODOS = [
  [30, "Últimos 30 días"],
  [90, "Últimos 90 días"],
  [365, "Último año"],
  [0, "Desde el principio"],
] as const;

const QUIEN = {
  todos: "Todos",
  usuarios: "Con cuenta (fábrica y concesionarios)",
  clientes: "Clientes sin cuenta",
} as const;

const ORDEN = {
  veces: "Más veces",
  az: "A → Z",
  za: "Z → A",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

function recurrencia(sp: SearchParams): Recurrencia {
  return {
    dias: z.coerce
      .number()
      .pipe(z.union(PERIODOS.map(([d]) => z.literal(d))))
      .catch(90)
      .parse(sp.dias),
    quien: z
      .enum(["todos", "usuarios", "clientes"])
      .catch("todos")
      .parse(sp.quien),
    orden: z.enum(["veces", "az", "za"]).catch("veces").parse(sp.orden),
  };
}

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
  const tab = TABS.some(([id]) => id === sp.tab) ? (sp.tab as Tab) : "accesos";

  return (
    <>
      <PageHeader title="Registros" />
      <nav aria-label="Registros" className="-mx-4 mb-5 overflow-x-auto px-4">
        <ul className="flex gap-1 border-b">
          {TABS.map(([id, label]) => (
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
      {tab === "accesos" && <Accesos sp={sp} />}
      {tab === "frecuentes" && <BusquedasFrecuentes r={recurrencia(sp)} />}
      {tab === "documentos" && <DocumentosConsultados r={recurrencia(sp)} />}
      {tab === "busquedas" && <Busquedas />}
    </>
  );
}

async function Accesos({ sp }: { sp: SearchParams }) {
  const [usuarios, concesionarios] = await Promise.all([
    listUsuarios(),
    listConcesionarios(),
  ]);
  const fecha = z.iso.date().optional().catch(undefined);
  const filters: AccesosFilters = {
    usuarioId: usuarios.find((u) => u.id === sp.usuario)?.id,
    soloClientes: sp.usuario === "clientes",
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
            defaultValue={
              filters.soloClientes ? "clientes" : (filters.usuarioId ?? "")
            }
          >
            <option value="">Todos</option>
            <option value="clientes">Clientes sin cuenta</option>
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
                    {r.usuarioNombre ?? "Cliente"}
                    <div className="text-sm text-muted-foreground">
                      {r.usuarioNombre
                        ? (r.concesionarioNombre ?? "Fábrica")
                        : "Sin cuenta"}
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

/** Período, quién y orden (A→Z / Z→A / más veces) para las pestañas de recurrencia. */
function RecurrenciaControles({ tab, r }: { tab: Tab; r: Recurrencia }) {
  const ordenHref = (orden: Recurrencia["orden"]) => {
    const params = new URLSearchParams({
      tab,
      dias: String(r.dias),
      quien: r.quien,
      orden,
    });
    return `/admin/registros?${params}`;
  };
  return (
    <div className="flex flex-col gap-3">
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="orden" value={r.orden} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="rc-dias">Período</Label>
          <NativeSelect id="rc-dias" name="dias" defaultValue={String(r.dias)}>
            {PERIODOS.map(([d, label]) => (
              <option key={d} value={d}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rc-quien">Quién</Label>
          <NativeSelect id="rc-quien" name="quien" defaultValue={r.quien}>
            {Object.entries(QUIEN).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary">
          Ver
        </Button>
      </form>
      <nav aria-label="Ordenar" className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-muted-foreground">Ordenar:</span>
        {(Object.keys(ORDEN) as Recurrencia["orden"][]).map((orden) => (
          <Link
            key={orden}
            href={ordenHref(orden)}
            aria-current={r.orden === orden ? "true" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-full border bg-card px-4 font-medium hover:border-foreground/30",
              r.orden === orden && "border-brand bg-brand/5 text-foreground",
            )}
          >
            {ORDEN[orden]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
      {children}
    </p>
  );
}

async function BusquedasFrecuentes({ r }: { r: Recurrencia }) {
  const rows = await busquedasFrecuentes(r);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Qué se busca y cuántas veces, sin distinguir acentos ni mayúsculas.
      </p>
      <RecurrenciaControles tab="frecuentes" r={r} />
      {rows.length === RECURRENCIA_LIMIT && (
        <p className="text-muted-foreground">
          Se muestran {RECURRENCIA_LIMIT}. Acotá el período para ver otras.
        </p>
      )}
      {rows.length === 0 ? (
        <Vacio>No hubo búsquedas con texto en este período.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Texto buscado</TableHead>
                <TableHead className="text-right">Veces</TableHead>
                <TableHead className="text-right">Sin resultados</TableHead>
                <TableHead>Última vez</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.texto}>
                  <TableCell className="font-medium whitespace-normal">
                    <Link
                      href={`/buscar?q=${encodeURIComponent(row.texto)}`}
                      className="text-brand-strong hover:underline"
                    >
                      {row.texto}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.veces}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.sinResultados || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatFecha(new Date(row.ultima))}
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

async function DocumentosConsultados({ r }: { r: Recurrencia }) {
  const rows = await documentosConsultados(r);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Cuántas veces se abrió cada documento (ficha, archivo o video).
      </p>
      <RecurrenciaControles tab="documentos" r={r} />
      {rows.length === RECURRENCIA_LIMIT && (
        <p className="text-muted-foreground">
          Se muestran {RECURRENCIA_LIMIT}. Acotá el período para ver otros.
        </p>
      )}
      {rows.length === 0 ? (
        <Vacio>No hubo consultas de documentos en este período.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Veces</TableHead>
                <TableHead className="text-right">Descargas</TableHead>
                <TableHead>Última vez</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-sm font-medium whitespace-normal">
                    <Link
                      href={`/admin/documentos/${row.id}`}
                      className="text-brand-strong hover:underline"
                    >
                      {row.titulo ?? "Sin título"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.veces}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.descargas || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatFecha(new Date(row.ultima))}
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
