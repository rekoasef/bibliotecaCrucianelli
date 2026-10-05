import { AlertTriangle, ExternalLink, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FileIcon, fileKindLabel } from "@/components/file-icon";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  listCatalogo,
  listEtiquetas,
  listSegmentos,
} from "@/db/queries/taxonomia";
import { requireAdmin } from "@/lib/auth/session";
import { getDocumentoVisible } from "@/lib/documentos/queries";
import {
  advertenciasArchivos,
  faltantesParaPublicar,
} from "@/lib/documentos/rules";
import {
  getDocumentoAdmin,
  opcionesMaquinas,
  siguienteBorrador,
} from "@/lib/documentos/service";
import { formatBytes } from "@/lib/drive/mime";
import { MoveButtons } from "../../move-buttons";
import { PageHeader, Panel } from "../../ui";
import {
  eliminarBorradorAction,
  marcarObsoletoAction,
  moverArchivoAction,
  nuevaVersionAction,
  quitarArchivoAction,
  restaurarVigenteAction,
  setModoAccesoAction,
} from "../actions";
import { EstadoDocBadge } from "../estado-badge";
import { DocumentoForm } from "./documento-form";

export const metadata: Metadata = { title: "Editar documento" };

const ESTADO_ERRORES: Record<string, string> = {
  estado: "No se pudo cambiar el estado del documento.",
  "ultimo-archivo": "Un documento publicado necesita al menos un archivo.",
};

export default async function EditarDocumentoPage({
  params,
  searchParams,
}: PageProps<"/admin/documentos/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const doc = await getDocumentoAdmin(id);
  if (!doc) notFound();

  const [
    tipos,
    sistemas,
    temas,
    segmentos,
    lineasConModelos,
    etiquetas,
    siguiente,
    ficha,
  ] = await Promise.all([
    listCatalogo("tipos"),
    listCatalogo("sistemas"),
    listCatalogo("temas"),
    listSegmentos(),
    opcionesMaquinas(),
    listEtiquetas(),
    siguienteBorrador(id),
    getDocumentoVisible(id, admin),
  ]);

  const faltan =
    doc.estado === "borrador"
      ? faltantesParaPublicar({
          titulo: doc.titulo,
          tipoId: doc.tipoId,
          cantidadArchivos: doc.archivos.length,
          cantidadMaquinas: doc.lineaIds.length + doc.modeloIds.length,
        })
      : [];
  const avisos = advertenciasArchivos(doc.visibilidad, doc.archivos);
  const reemplaza = doc.reemplazaId
    ? await getDocumentoAdmin(doc.reemplazaId)
    : null;

  const mensaje = sp.publicado
    ? "Documento publicado."
    : sp.creado
      ? "Borrador creado. Completá la clasificación y publicalo."
      : sp.agregados
        ? "Archivo agregado."
        : sp.anterior
          ? "Guardado. Este es el siguiente borrador."
          : null;
  const error = typeof sp.error === "string" ? ESTADO_ERRORES[sp.error] : null;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title={doc.titulo || "Sin título"}
        back={{ href: "/admin/documentos", label: "Documentos" }}
        actions={<EstadoDocBadge estado={doc.estado} />}
      />
      {mensaje && <FormMessage state={{ success: mensaje }} />}
      {error && <FormMessage state={{ error }} />}

      {reemplaza && doc.estado === "borrador" && (
        <p className="rounded-lg border bg-card p-4">
          Nueva versión de{" "}
          <Link
            href={`/admin/documentos/${reemplaza.id}`}
            className="font-semibold text-brand-strong underline"
          >
            {reemplaza.titulo}
          </Link>
          . Al publicarla, la anterior pasa a obsoleta.
        </p>
      )}

      {(faltan.length > 0 || avisos.length > 0) && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-700/30 bg-amber-50 p-4 text-amber-950">
          {faltan.length > 0 && (
            <>
              <p className="font-semibold">Para publicar falta:</p>
              <ul className="list-disc pl-5">
                {faltan.map((f) => (
                  <li key={f}>{f.replace(/^Falta /, "").replace(/\.$/, "")}</li>
                ))}
              </ul>
            </>
          )}
          {avisos.map((a) => (
            <p key={a} className="flex gap-2">
              <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
              {a}
            </p>
          ))}
        </div>
      )}

      <Panel title={`Archivos (${doc.archivos.length})`}>
        {doc.archivos.length === 0 && (
          <p className="text-muted-foreground">Sin archivos todavía.</p>
        )}
        <ul className="-mx-2 flex flex-col divide-y">
          {doc.archivos.map((a, i) => (
            <li key={a.id} className="flex flex-col gap-3 px-2 py-3">
              <div className="flex items-start gap-3">
                <FileIcon
                  mimeType={a.mimeType}
                  className="mt-0.5 text-muted-foreground"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold break-words">{a.nombre}</span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      fileKindLabel(a.mimeType),
                      formatBytes(a.tamanoBytes),
                      `texto: ${a.estadoExtraccion.replace("_", " ")}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {!a.disponible && " · NO DISPONIBLE"}
                  </span>
                </div>
                <MoveButtons
                  action={moverArchivoAction}
                  fields={{ id, archivoId: a.id }}
                  label={a.nombre}
                  isFirst={i === 0}
                  isLast={i === doc.archivos.length - 1}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-9">
                <form
                  action={setModoAccesoAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="archivoId" value={a.id} />
                  <input
                    type="hidden"
                    name="modo"
                    value={a.modoAcceso === "servidor" ? "publico" : "servidor"}
                  />
                  <span className="text-sm">
                    {a.modoAcceso === "servidor"
                      ? "Servido por la app (privado)"
                      : "Link público de Drive"}
                  </span>
                  <Button type="submit" variant="outline" size="sm">
                    {a.modoAcceso === "servidor"
                      ? "Usar link público"
                      : "Servir por la app"}
                  </Button>
                </form>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={`/api/archivos/${a.id}`}
                    target="_blank"
                    rel="noopener"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                    Ver
                  </a>
                </Button>
                <form action={quitarArchivoAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="archivoId" value={a.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Quitar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <Button asChild variant="outline" className="self-start">
          <Link href={`/admin/drive?agregarA=${id}`}>
            <Plus aria-hidden className="size-5" />
            Agregar archivo desde Drive
          </Link>
        </Button>
      </Panel>

      <DocumentoForm
        doc={doc}
        tipos={tipos}
        sistemas={sistemas}
        temas={temas}
        segmentos={segmentos.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          activo: s.activo,
          lineas: lineasConModelos.filter((l) => l.segmentoId === s.id),
        }))}
        etiquetasExistentes={etiquetas.map((e) => e.nombre)}
        haySiguienteBorrador={siguiente !== null}
      />

      {ficha && ficha.historial.length > 1 && (
        <Panel title="Versiones">
          <ol className="flex flex-col gap-1">
            {ficha.historial.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                {v.id === id ? (
                  <span className="font-semibold">{v.titulo} (este)</span>
                ) : (
                  <Link
                    href={`/admin/documentos/${v.id}`}
                    className="font-medium text-brand-strong underline"
                  >
                    {v.titulo}
                  </Link>
                )}
                {v.version && (
                  <span className="text-muted-foreground">{v.version}</span>
                )}
                <EstadoDocBadge estado={v.estado} />
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel title="Estado">
        <div className="flex flex-wrap gap-2">
          {doc.estado !== "borrador" && (
            <Button asChild variant="outline">
              <Link href={`/documentos/${id}`}>Ver ficha</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/documentos/${id}?como=concesionario`}>
              Ver como concesionario
            </Link>
          </Button>
          {doc.estado === "vigente" && (
            <>
              <EstadoButton
                action={nuevaVersionAction}
                id={id}
                label="Nueva versión"
              />
              <EstadoButton
                action={marcarObsoletoAction}
                id={id}
                label="Marcar obsoleto"
                destructive
              />
            </>
          )}
          {doc.estado === "obsoleto" && !doc.reemplazadoPorId && (
            <EstadoButton
              action={restaurarVigenteAction}
              id={id}
              label="Volver a vigente"
            />
          )}
          {doc.estado === "borrador" && (
            <EstadoButton
              action={eliminarBorradorAction}
              id={id}
              label="Eliminar borrador"
              destructive
            />
          )}
        </div>
        {doc.estado === "vigente" && (
          <p className="text-sm text-muted-foreground">
            Nueva versión: crea un borrador con la misma clasificación; al
            publicarlo, este pasa a obsoleto.
          </p>
        )}
      </Panel>
    </div>
  );
}

function EstadoButton({
  action,
  id,
  label,
  destructive = false,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
  destructive?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant={destructive ? "destructive" : "outline"}>
        {label}
      </Button>
    </form>
  );
}
