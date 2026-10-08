import { AlertTriangle, Download, Eye, FileWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FileIcon, fileKindLabel } from "@/components/file-icon";
import { DobleTrazo } from "@/components/brand/doble-trazo";
import { Franja } from "@/components/layout/franja";
import { TipoIcon } from "@/components/tipo-icon";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";
import { CLIENTE } from "@/lib/documentos/visibility";
import {
  getDocumentoVisible,
  registrarAcceso,
  type ArchivoPublico,
} from "@/lib/documentos/queries";
import {
  canDisplayInline,
  formatBytes,
  isImage,
  isVideo,
} from "@/lib/drive/mime";
import { ShareButton } from "./share-button";
import { VideoPlayer } from "./video-player";

export const metadata: Metadata = { title: "Documento" };

const PREVIEW = {
  concesionario: {
    viewer: { rol: "concesionario" },
    quien: "Un concesionario",
    publico: "concesionarios",
  },
  cliente: { viewer: CLIENTE, quien: "Un cliente", publico: "clientes" },
} as const;

const fechaLarga = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default async function DocumentoPage({
  params,
  searchParams,
}: PageProps<"/documentos/[id]">) {
  const { user, viewer: lector } = await getViewer();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  // Vista previa para el admin: "cómo lo ve un concesionario / un cliente" (docs/05).
  const preview =
    user?.rol === "admin" &&
    (sp.como === "concesionario" || sp.como === "cliente")
      ? PREVIEW[sp.como]
      : null;
  const viewer = preview?.viewer ?? lector;

  const doc = await getDocumentoVisible(id, viewer);
  if (!doc) {
    if (preview) {
      return (
        <PreviewBanner id={id}>
          {preview.quien} <strong>no puede ver</strong> este documento (es
          borrador, no está marcado para {preview.publico} o sus máquinas están
          inactivas).
        </PreviewBanner>
      );
    }
    notFound();
  }
  if (!preview)
    await registrarAcceso({
      usuarioId: user?.id ?? null,
      documentoId: id,
      accion: "ver",
    });

  const vigente =
    doc.estado === "obsoleto"
      ? doc.historial.find((v) => v.estado === "vigente")
      : undefined;
  // Máquinas como calcos en la cabecera: modelos puntuales o líneas completas.
  const maquinas = [
    ...doc.lineas.map((l) => l.nombre),
    ...doc.modelos.map((m) => m.nombre),
  ];
  const fecha = doc.fechaDocumento
    ? fechaLarga.format(new Date(doc.fechaDocumento))
    : null;

  return (
    <article className="flex flex-col gap-6">
      <Franja className="flex flex-col gap-3">
        <h1 className="font-display text-2xl leading-tight font-extrabold md:text-4xl">
          {doc.titulo}
        </h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-semibold text-white">
          {maquinas.map((m) => (
            <span
              key={m}
              className="flex items-center gap-1.5 font-display text-lg leading-none font-extrabold tracking-wide uppercase"
            >
              <DobleTrazo className="h-3.5 w-3 fill-white" />
              {m}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <TipoIcon slug={doc.tipoSlug ?? ""} className="size-5" />
            {doc.tipoNombre}
          </span>
          {(doc.version || fecha) && (
            <span>{[doc.version, fecha].filter(Boolean).join(" · ")}</span>
          )}
          {!doc.visibleConcesionarios && !doc.visibleClientes && (
            <span className="rounded-full border border-white/70 px-2.5 py-0.5 text-sm">
              Solo fábrica
            </span>
          )}
        </p>
      </Franja>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          {preview && (
            <PreviewBanner id={id}>
              Así ve este documento {preview.quien.toLowerCase()}.
            </PreviewBanner>
          )}

          {doc.estado === "obsoleto" && (
            <div
              role="note"
              className="flex gap-3 rounded-xl border border-amber-700/30 bg-amber-50 p-4 text-amber-950"
            >
              <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p>
                <strong>Documento obsoleto.</strong>{" "}
                {vigente ? (
                  <Link
                    href={`/documentos/${vigente.id}`}
                    className="font-semibold underline underline-offset-4"
                  >
                    Ver la versión vigente
                  </Link>
                ) : (
                  "Puede no estar actualizado."
                )}
              </p>
            </div>
          )}

          <section aria-label="Archivos" className="flex flex-col gap-4">
            {doc.archivos.map((a) => (
              <ArchivoCard key={a.id} archivo={a} />
            ))}
          </section>

          {doc.descripcion && (
            <p className="text-lg leading-relaxed whitespace-pre-line">
              {doc.descripcion}
            </p>
          )}

          {doc.historial.length > 1 && (
            <section
              aria-labelledby="titulo-versiones"
              className="flex flex-col gap-2"
            >
              <h2
                id="titulo-versiones"
                className="font-display text-lg font-extrabold"
              >
                Versiones
              </h2>
              <ol className="flex flex-col divide-y rounded-xl border bg-card">
                {doc.historial.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/documentos/${v.id}`}
                      aria-current={v.id === doc.id ? "page" : undefined}
                      className="flex min-h-12 flex-wrap items-center gap-x-3 px-4 py-2 hover:bg-accent aria-[current=page]:font-semibold"
                    >
                      <span>{v.version || v.titulo}</span>
                      <span className="text-sm text-muted-foreground">
                        {v.estado === "vigente" ? "Vigente" : "Obsoleta"}
                        {v.id === doc.id && " · esta"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <ShareButton title={doc.titulo ?? "Documento"} />
            {user?.rol === "admin" && !preview && (
              <>
                <Button asChild variant="ghost">
                  <Link href={`/admin/documentos/${doc.id}`}>Editar</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/documentos/${doc.id}?como=concesionario`}>
                    Ver como concesionario
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/documentos/${doc.id}?como=cliente`}>
                    Ver como cliente
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
        <aside aria-label="Clasificación" className="lg:pt-1">
          <Chips
            grupos={[
              {
                label: "Máquinas",
                chips: [
                  ...doc.lineas.map((l) => ({
                    label: `${l.nombre} (todas)`,
                    href: `/buscar?linea=${l.slug}`,
                  })),
                  ...doc.modelos.map((m) => ({
                    label: m.nombre,
                    href: `/buscar?modelo=${m.slug}`,
                  })),
                ],
              },
              {
                label: "Producto",
                chips: doc.productos.map((p) => ({
                  label: p.nombre,
                  href: `/buscar?producto=${p.slug}`,
                })),
              },
              {
                label: "Tecnología",
                chips: doc.tecnologias.map((t) => ({
                  label: t.nombre,
                  href: `/buscar?tecnologia=${t.slug}`,
                })),
              },
              {
                label: "Sistemas",
                chips: doc.sistemas.map((s) => ({
                  label: s.nombre,
                  href: `/buscar?sistema=${s.slug}`,
                })),
              },
              {
                label: "Temas",
                chips: doc.temas.map((t) => ({
                  label: t.nombre,
                  href: `/buscar?tema=${t.slug}`,
                })),
              },
              {
                label: "Etiquetas",
                chips: doc.etiquetas.map((e) => ({
                  label: e.nombre,
                  href: `/buscar?etiqueta=${encodeURIComponent(e.normalizado)}`,
                })),
              },
            ]}
          />
        </aside>
      </div>
    </article>
  );
}

function ArchivoCard({ archivo: a }: { archivo: ArchivoPublico }) {
  const url = `/api/archivos/${a.id}`;
  const meta = [fileKindLabel(a.mimeType), formatBytes(a.tamanoBytes)]
    .filter(Boolean)
    .join(" · ");

  if (!a.disponible) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-4 text-muted-foreground">
        <FileWarning aria-hidden className="size-6 shrink-0" />
        <p>
          <span className="font-semibold">{a.nombre}</span> no está disponible
          por el momento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileIcon
          mimeType={a.mimeType}
          className="mt-0.5 text-muted-foreground"
        />
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold break-words">{a.nombre}</span>
          <span className="text-sm text-muted-foreground">{meta}</span>
        </div>
      </div>

      {isVideo(a.mimeType) && a.modoAcceso === "publico" && a.driveFileId ? (
        <VideoPlayer
          archivoId={a.id}
          driveFileId={a.driveFileId}
          nombre={a.nombre}
        />
      ) : isVideo(a.mimeType) ? (
        <video
          controls
          preload="none"
          src={url}
          className="aspect-video w-full rounded-lg bg-foreground"
        />
      ) : isImage(a.mimeType) && canDisplayInline(a.mimeType) ? (
        // eslint-disable-next-line @next/next/no-img-element -- servida por /api/archivos, sin optimizar
        <img
          src={url}
          alt={a.nombre}
          loading="lazy"
          className="max-h-[70vh] w-full rounded-lg object-contain"
        />
      ) : null}

      {!isVideo(a.mimeType) && (
        <div className="flex flex-wrap gap-2">
          {canDisplayInline(a.mimeType) && !isImage(a.mimeType) && (
            <Button asChild size="lg">
              <a href={url}>
                <Eye aria-hidden className="size-5" />
                Ver
              </a>
            </Button>
          )}
          <Button
            asChild
            size="lg"
            variant={
              canDisplayInline(a.mimeType) && !isImage(a.mimeType)
                ? "outline"
                : "default"
            }
          >
            <a href={`${url}?descargar=1`}>
              <Download aria-hidden className="size-5" />
              Descargar
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

function Chips({
  grupos,
}: {
  grupos: { label: string; chips: { label: string; href: string }[] }[];
}) {
  const conChips = grupos.filter((g) => g.chips.length > 0);
  if (conChips.length === 0) return null;
  return (
    <dl className="flex flex-col gap-3">
      {conChips.map((g) => (
        <div key={g.label} className="flex flex-col gap-1.5">
          <dt className="text-sm font-semibold text-muted-foreground">
            {g.label}
          </dt>
          <dd className="flex flex-wrap gap-2">
            {g.chips.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="flex min-h-11 items-center rounded-full border bg-card px-3 font-medium hover:border-foreground/30 active:bg-accent"
              >
                {c.label}
              </Link>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewBanner({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-4">
      <p>{children}</p>
      <Button asChild variant="outline">
        <Link href={`/admin/documentos/${id}`}>Volver a editar</Link>
      </Button>
    </div>
  );
}
