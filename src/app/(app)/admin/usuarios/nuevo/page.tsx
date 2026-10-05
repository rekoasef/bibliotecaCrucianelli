import type { Metadata } from "next";
import { listConcesionarios } from "@/db/queries/usuarios";
import { PageHeader, Panel } from "../../ui";
import { UsuarioForm } from "../usuario-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage({
  searchParams,
}: PageProps<"/admin/usuarios/nuevo">) {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const { concesionario } = await searchParams;
  const concesionarios = await listConcesionarios();
  const defaultConcesionarioId =
    typeof concesionario === "string" &&
    concesionarios.some((c) => c.id === concesionario)
      ? concesionario
      : undefined;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nuevo usuario"
        back={{ href: "/admin/usuarios", label: "Usuarios" }}
      />
      <Panel>
        <UsuarioForm
          concesionarios={concesionarios}
          defaultConcesionarioId={defaultConcesionarioId}
        />
      </Panel>
    </div>
  );
}
