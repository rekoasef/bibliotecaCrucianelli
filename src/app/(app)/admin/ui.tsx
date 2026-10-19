/**
 * Componentes de presentación comunes a las páginas del admin.
 *
 * @module
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { EstadoUsuario } from "@/db/queries/usuarios";
import { cn } from "@/lib/utils";

/**
 * Encabezado de página del admin: link de volver, título, descripción y
 * acciones.
 *
 * @param props - `title`, `description`, `back` (destino y texto) y `actions`.
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 flex min-h-11 items-center gap-1.5 self-start font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-5" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
    </div>
  );
}

/** Panel con título opcional para agrupar contenido de una página del admin. */
export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5",
        className,
      )}
    >
      {title && <h2 className="text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

/** Texto y colores de cada estado de usuario. */
const ESTADO: Record<EstadoUsuario, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "border-emerald-700/30 bg-emerald-50 text-emerald-900",
  },
  pendiente: {
    label: "Invitación pendiente",
    className: "border-amber-700/30 bg-amber-50 text-amber-900",
  },
  pausado: {
    label: "Pausado por inactividad",
    className: "border-sky-700/30 bg-sky-50 text-sky-950",
  },
  inactivo: {
    label: "Inactivo",
    className: "border-border bg-muted text-muted-foreground",
  },
};

/**
 * Insignia del estado de un usuario (activo, pendiente, pausado, inactivo).
 *
 * @param props - `estado` de `estadoUsuario`.
 */
export function EstadoBadge({ estado }: { estado: EstadoUsuario }) {
  const { label, className } = ESTADO[estado];
  return (
    <Badge variant="outline" className={cn("h-7 px-2.5 text-sm", className)}>
      {label}
    </Badge>
  );
}

/** Marca compacta para ítems desactivados en listas. */
export function InactivoBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      Inactivo
    </Badge>
  );
}

/** Insignia de activo o inactivo (variante de {@link EstadoBadge}). */
export function ActivoBadge({ activo }: { activo: boolean }) {
  return <EstadoBadge estado={activo ? "activo" : "inactivo"} />;
}

/** Fecha y hora cortas en es-AR. */
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * Fecha y hora (Argentina) para las tablas del admin; "Nunca" si no hay.
 *
 * @param date - Fecha, o `null`.
 */
export function formatFecha(date: Date | null) {
  return date ? dateFormat.format(date) : "Nunca";
}
