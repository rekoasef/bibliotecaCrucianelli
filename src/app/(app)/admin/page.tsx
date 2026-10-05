import { Building2, ChevronRight, MailWarning, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listConcesionarios, listUsuarios } from "@/db/queries/usuarios";
import { PageHeader } from "./ui";

export const metadata: Metadata = { title: "Administración" };

// TODO(Fase 5): pendientes de documentos, búsquedas sin resultados y advertencias (docs/05).
export default async function AdminPage() {
  const [usuarios, pendientes, concesionarios] = await Promise.all([
    listUsuarios(),
    listUsuarios({ estado: "pendiente" }),
    listConcesionarios(),
  ]);

  const cards = [
    {
      href: "/admin/usuarios",
      label: "Usuarios",
      value: usuarios.length,
      icon: Users,
    },
    {
      href: "/admin/usuarios?estado=pendiente",
      label: "Invitaciones pendientes",
      value: pendientes.length,
      icon: MailWarning,
    },
    {
      href: "/admin/concesionarios",
      label: "Concesionarios",
      value: concesionarios.length,
      icon: Building2,
    },
  ];

  return (
    <>
      <PageHeader title="Panel" />
      <ul className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ href, label, value, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Icon aria-hidden className="size-6 shrink-0 text-brand-strong" />
              <span className="flex flex-1 flex-col">
                <span className="text-3xl font-bold tabular-nums">{value}</span>
                <span className="text-muted-foreground">{label}</span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-5 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
