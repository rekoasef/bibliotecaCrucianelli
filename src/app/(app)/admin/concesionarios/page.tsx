import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listConcesionarios } from "@/db/queries/usuarios";
import { ActivoBadge, PageHeader } from "../ui";

export const metadata: Metadata = { title: "Concesionarios" };

export default async function ConcesionariosPage() {
  const concesionarios = await listConcesionarios();

  return (
    <>
      <PageHeader
        title="Concesionarios"
        description={`${concesionarios.length} en total`}
        actions={
          <Button asChild>
            <Link href="/admin/concesionarios/nuevo">
              <Plus aria-hidden className="size-5" />
              Nuevo concesionario
            </Link>
          </Button>
        }
      />
      {concesionarios.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          Todavía no hay concesionarios cargados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead className="text-right">Usuarios</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concesionarios.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/concesionarios/${c.id}`}
                      className="font-semibold text-brand-strong underline-offset-4 hover:underline"
                    >
                      {c.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.localidad}, {c.provincia}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.cantidadUsuarios}
                  </TableCell>
                  <TableCell>
                    <ActivoBadge activo={c.activo} />
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
