import {
  AlertTriangle,
  Building2,
  ChevronRight,
  FileClock,
  FileWarning,
  MailWarning,
  RefreshCw,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listConcesionarios, listUsuarios } from "@/db/queries/usuarios";
import { resumenPanel } from "@/lib/documentos/service";
import { PageHeader, Panel } from "./ui";

export const metadata: Metadata = { title: "Administración" };

// TODO(Fase 5): búsquedas sin resultados y errores de extracción (docs/05).
export default async function AdminPage() {
  const [usuarios, pendientes, concesionarios, resumen] = await Promise.all([
    listUsuarios(),
    listUsuarios({ estado: "pendiente" }),
    listConcesionarios(),
    resumenPanel(),
  ]);

  const cards = [
    {
      href: "/admin/documentos?estado=borrador",
      label: "Borradores por clasificar",
      value: resumen.borradores,
      icon: FileClock,
    },
    {
      href: "/admin/documentos?revision=1",
      label: "Cambiaron en Drive (revisar)",
      value: resumen.revision,
      icon: RefreshCw,
    },
    {
      href: "/admin/documentos",
      label: "Archivos no disponibles",
      value: resumen.no_disponibles,
      icon: FileWarning,
    },
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
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {resumen.videosPublicos.length > 0 && (
        <Panel
          title="Advertencias"
          className="mt-5 border-amber-700/30 bg-amber-50 text-amber-950"
        >
          <ul className="flex flex-col gap-2">
            {resumen.videosPublicos.map((v) => (
              <li key={v.archivo} className="flex gap-2">
                <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
                <span>
                  Video con link público en un documento “Solo fábrica”:{" "}
                  <Link
                    href={`/admin/documentos/${v.documentoId}`}
                    className="font-semibold underline"
                  >
                    {v.titulo ?? v.archivo}
                  </Link>
                  . Pasalo a modo servidor.
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
