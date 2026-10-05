import type { Metadata } from "next";
import { PageHeader, Panel } from "../../ui";
import { ConcesionarioForm } from "../concesionario-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nuevo concesionario" };

export default async function NuevoConcesionarioPage() {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nuevo concesionario"
        back={{ href: "/admin/concesionarios", label: "Concesionarios" }}
      />
      <Panel>
        <ConcesionarioForm />
      </Panel>
    </div>
  );
}
