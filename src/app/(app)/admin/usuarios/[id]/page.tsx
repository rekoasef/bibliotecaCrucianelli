import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  estadoUsuario,
  getUsuario,
  listConcesionarios,
} from "@/db/queries/usuarios";
import { requireAdmin } from "@/lib/auth/session";
import { setUsuarioActivo } from "../../actions";
import { EstadoBadge, formatFecha, PageHeader, Panel } from "../../ui";
import { UsuarioForm } from "../usuario-form";
import { ResendInvitation } from "./resend-invitation";

export const metadata: Metadata = { title: "Usuario" };

export default async function UsuarioPage({
  params,
  searchParams,
}: PageProps<"/admin/usuarios/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { invitado } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const [usuario, concesionarios] = await Promise.all([
    getUsuario(id),
    listConcesionarios(),
  ]);
  if (!usuario) notFound();
  const estado = estadoUsuario(usuario);
  const esUnoMismo = usuario.id === admin.id;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader
        title={usuario.nombre}
        description={`Último ingreso: ${formatFecha(usuario.ultimoIngreso)}`}
        back={{ href: "/admin/usuarios", label: "Usuarios" }}
        actions={<EstadoBadge estado={estado} />}
      />
      {invitado === "1" && (
        <FormMessage
          state={{
            success: `Usuario creado. Le enviamos la invitación a ${usuario.email}.`,
          }}
        />
      )}
      {invitado === "error" && (
        <FormMessage
          state={{
            error:
              "El usuario se creó, pero no se pudo enviar la invitación. Probá reenviarla.",
          }}
        />
      )}

      {estado === "pendiente" && (
        <Panel title="Invitación pendiente">
          <p className="text-muted-foreground">
            Todavía no definió su contraseña. La invitación dura 7 días;
            reenviarla invalida el link anterior.
          </p>
          <ResendInvitation id={usuario.id} />
        </Panel>
      )}

      <Panel title="Datos">
        <UsuarioForm concesionarios={concesionarios} usuario={usuario} />
      </Panel>

      {!esUnoMismo && (
        <Panel title={usuario.activo ? "Desactivar" : "Reactivar"}>
          <p className="text-muted-foreground">
            {usuario.activo
              ? "No va a poder ingresar y se cierran sus sesiones abiertas."
              : "Vuelve a poder ingresar con su contraseña."}
          </p>
          <form action={setUsuarioActivo}>
            <input type="hidden" name="id" value={usuario.id} />
            <input
              type="hidden"
              name="activo"
              value={String(!usuario.activo)}
            />
            <Button
              type="submit"
              variant={usuario.activo ? "destructive" : "outline"}
            >
              {usuario.activo ? "Desactivar usuario" : "Reactivar usuario"}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
