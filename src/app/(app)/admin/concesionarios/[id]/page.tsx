import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  estadoUsuario,
  getConcesionario,
  listUsuarios,
} from "@/db/queries/usuarios";
import { setConcesionarioActivo } from "../../actions";
import { ActivoBadge, EstadoBadge, PageHeader, Panel } from "../../ui";
import { ConcesionarioForm } from "../concesionario-form";

export const metadata: Metadata = { title: "Concesionario" };

export default async function ConcesionarioPage({
  params,
  searchParams,
}: PageProps<"/admin/concesionarios/[id]">) {
  const { id } = await params;
  const { creado } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const concesionario = await getConcesionario(id);
  if (!concesionario) notFound();
  const usuarios = await listUsuarios({ concesionarioId: id });

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title={concesionario.nombre}
        description={`${concesionario.localidad}, ${concesionario.provincia}`}
        back={{ href: "/admin/concesionarios", label: "Concesionarios" }}
        actions={<ActivoBadge activo={concesionario.activo} />}
      />
      {creado && <FormMessage state={{ success: "Concesionario creado." }} />}

      <Panel title={`Mecánicos (${usuarios.length})`}>
        {usuarios.length === 0 ? (
          <p className="text-muted-foreground">Todavía no tiene usuarios.</p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {usuarios.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/usuarios/${u.id}`}
                  className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-2 py-2 hover:bg-accent"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{u.nombre}</span>
                    <span className="text-sm break-all text-muted-foreground">
                      {u.email}
                    </span>
                  </span>
                  <EstadoBadge estado={estadoUsuario(u)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" className="self-start">
          <Link href={`/admin/usuarios/nuevo?concesionario=${id}`}>
            <Plus aria-hidden className="size-5" />
            Agregar mecánico
          </Link>
        </Button>
      </Panel>

      <Panel title="Datos">
        <ConcesionarioForm concesionario={concesionario} />
      </Panel>

      <Panel title={concesionario.activo ? "Desactivar" : "Reactivar"}>
        <p className="text-muted-foreground">
          {concesionario.activo
            ? "Ninguno de sus usuarios va a poder ingresar, y se cierran las sesiones abiertas."
            : "Sus usuarios activos vuelven a poder ingresar."}
        </p>
        <form action={setConcesionarioActivo}>
          <input type="hidden" name="id" value={id} />
          <input
            type="hidden"
            name="activo"
            value={String(!concesionario.activo)}
          />
          <Button
            type="submit"
            variant={concesionario.activo ? "destructive" : "outline"}
          >
            {concesionario.activo
              ? "Desactivar concesionario"
              : "Reactivar concesionario"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
