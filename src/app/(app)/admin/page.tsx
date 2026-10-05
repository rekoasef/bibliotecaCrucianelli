import {
  AlertTriangle,
  Building2,
  ChevronRight,
  FileClock,
  FileWarning,
  MailWarning,
  FileX,
  RefreshCw,
  SearchX,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { busquedasSinResultados } from "@/db/queries/registros";
import { getTarea } from "@/db/queries/tareas";
import { listConcesionarios, listUsuarios } from "@/db/queries/usuarios";
import { SYNC_TASK } from "@/lib/tareas";
import { resumenPanel } from "@/lib/documentos/service";
import { formatFecha, PageHeader, Panel } from "./ui";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const [usuarios, pendientes, concesionarios, resumen, sinResultados, sync] =
    await Promise.all([
      listUsuarios(),
      listUsuarios({ estado: "pendiente" }),
      listConcesionarios(),
      resumenPanel(),
      busquedasSinResultados(30, 10),
      getTarea(SYNC_TASK),
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
      href: "/admin/documentos?problemas=1",
      label: "Archivos no disponibles en Drive",
      value: resumen.no_disponibles,
      icon: FileWarning,
    },
    {
      href: "/admin/documentos?problemas=1",
      label: "Errores de extracción de texto",
      value: resumen.errores_extraccion,
      icon: FileX,
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

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Búsquedas sin resultados (30 días)">
          {sinResultados.length === 0 ? (
            <p className="text-muted-foreground">
              Ninguna en los últimos 30 días.
            </p>
          ) : (
            <ol className="flex flex-col divide-y">
              {sinResultados.map((b) => (
                <li
                  key={b.texto}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <SearchX
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    {b.texto}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {b.veces === 1 ? "1 vez" : `${b.veces} veces`}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Link
            href="/admin/registros?tab=busquedas"
            className="self-start font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            Ver todas
          </Link>
        </Panel>

        <Panel title="Detección de cambios en Drive">
          {sync ? (
            <>
              <p>
                Última revisión:{" "}
                <strong>{formatFecha(sync.ultimaEjecucion)}</strong>
              </p>
              {sync.resultado && (
                <p className="text-muted-foreground">
                  {sync.resultado.revisados} archivos revisados ·{" "}
                  {sync.resultado.cambiados} cambiaron ·{" "}
                  {sync.resultado.noDisponibles} no disponibles
                  {Number(sync.resultado.errores) > 0 &&
                    ` · ${sync.resultado.errores} con error de conexión`}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Todavía no corrió. La hace el worker cada noche (o a mano con{" "}
              <code>npm run sync:drive</code>).
            </p>
          )}
        </Panel>
      </div>

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
