import type { Metadata } from "next";
import { PageHeader, Panel } from "../../ui";
import { ConcesionarioForm } from "../concesionario-form";

export const metadata: Metadata = { title: "Nuevo concesionario" };

export default function NuevoConcesionarioPage() {
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
