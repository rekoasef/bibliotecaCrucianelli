import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
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
  estadoUsuario,
  listConcesionarios,
  listUsuarios,
  type UsuarioFilters,
} from "@/db/queries/usuarios";
import { rolUsuario } from "@/db/schema";
import { ROL_LABEL } from "@/lib/labels";
import { EstadoBadge, formatFecha, PageHeader } from "../ui";

export const metadata: Metadata = { title: "Usuarios" };

const ESTADOS = {
  activo: "Activo",
  pendiente: "Invitación pendiente",
  inactivo: "Inactivo",
} as const;

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export default async function UsuariosPage({
  searchParams,
}: PageProps<"/admin/usuarios">) {
  const sp = await searchParams;
  const concesionarios = await listConcesionarios();
  const filters: UsuarioFilters = {
    rol: pick(sp.rol, rolUsuario.enumValues),
    estado: pick(sp.estado, Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]),
    concesionarioId: pick(
      sp.concesionario,
      concesionarios.map((c) => c.id),
    ),
  };
  const usuarios = await listUsuarios(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={`${usuarios.length} ${hasFilters ? "con estos filtros" : "en total"}`}
        actions={
          <Button asChild>
            <Link href="/admin/usuarios/nuevo">
              <Plus aria-hidden className="size-5" />
              Nuevo usuario
            </Link>
          </Button>
        }
      />

      {/* Formulario GET: los filtros quedan en la URL y funciona sin JavaScript. */}
      <form className="mb-5 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <FilterSelect id="f-rol" name="rol" label="Rol" value={filters.rol}>
          {rolUsuario.enumValues.map((r) => (
            <option key={r} value={r}>
              {ROL_LABEL[r]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="f-concesionario"
          name="concesionario"
          label="Concesionario"
          value={filters.concesionarioId}
        >
          {concesionarios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="f-estado"
          name="estado"
          label="Estado"
          value={filters.estado}
        >
          {Object.entries(ESTADOS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="secondary"
            className="flex-1 lg:flex-none"
          >
            Filtrar
          </Button>
          {hasFilters && (
            <Button asChild variant="ghost">
              <Link href="/admin/usuarios">Limpiar</Link>
            </Button>
          )}
        </div>
      </form>

      {usuarios.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          {hasFilters
            ? "No hay usuarios con estos filtros."
            : "Todavía no hay usuarios."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último ingreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/admin/usuarios/${u.id}`}
                      className="font-semibold text-brand-strong underline-offset-4 hover:underline"
                    >
                      {u.nombre}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {ROL_LABEL[u.rol]}
                    {u.concesionarioNombre && (
                      <div className="text-sm text-muted-foreground">
                        {u.concesionarioNombre}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={estadoUsuario(u)} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatFecha(u.ultimoIngreso)}
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

function FilterSelect({
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
