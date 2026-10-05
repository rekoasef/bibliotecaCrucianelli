import { CheckCircle2, ChevronRight, FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { FileIcon } from "@/components/file-icon";
import { db } from "@/db";
import { documentos } from "@/db/schema";
import { driveIdsIncorporados } from "@/lib/documentos/service";
import {
  getDrive,
  isDriveConfigured,
  pathFromRoot,
  type DriveItem,
} from "@/lib/drive";
import { formatBytes, isImage } from "@/lib/drive/mime";
import { PageHeader } from "../ui";
import { formatFecha } from "../ui";
import { FotoLineaForm, IncorporarForm } from "./incorporar-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Incorporar desde Drive" };

export default async function DrivePage({
  searchParams,
}: PageProps<"/admin/drive">) {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const sp = await searchParams;
  const carpeta = typeof sp.carpeta === "string" ? sp.carpeta : undefined;
  const agregarA = z.uuid().safeParse(sp.agregarA).data;
  // Modo "elegir foto de una línea": selección única de imágenes.
  const fotoLinea = agregarA
    ? undefined
    : z.uuid().safeParse(sp.fotoLinea).data;

  if (!isDriveConfigured()) {
    return (
      <>
        <PageHeader title="Incorporar desde Drive" />
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          Drive todavía no está configurado. Hay que cargar la cuenta de
          servicio (GOOGLE_SERVICE_ACCOUNT_EMAIL,
          GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) y las carpetas raíz
          (DRIVE_ROOT_FOLDER_IDS) en el servidor.
        </p>
      </>
    );
  }

  const destino = agregarA
    ? (
        await db
          .select({ titulo: documentos.titulo })
          .from(documentos)
          .where(eq(documentos.id, agregarA))
      )[0]
    : undefined;
  const conAgregar = (params: Record<string, string>) =>
    `/admin/drive?${new URLSearchParams({
      ...params,
      ...(agregarA ? { agregarA } : {}),
      ...(fotoLinea ? { fotoLinea } : {}),
    })}`;

  const drive = getDrive();
  let camino: DriveItem[] = [];
  let items: DriveItem[];
  if (carpeta) {
    const path = await pathFromRoot(carpeta);
    if (!path || !path.at(-1)?.isFolder) {
      return (
        <>
          <PageHeader
            title="Incorporar desde Drive"
            back={{ href: conAgregar({}), label: "Carpetas raíz" }}
          />
          <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
            La carpeta no existe o está fuera de las carpetas permitidas.
          </p>
        </>
      );
    }
    camino = path;
    items = await drive.listChildren(carpeta);
  } else {
    const roots = await Promise.all(
      (await drive.rootIds()).map((id) => drive.getItem(id)),
    );
    items = roots.filter((r): r is DriveItem => r !== null);
  }

  const carpetas = items.filter((i) => i.isFolder);
  const archivos = items.filter((i) => !i.isFolder);
  const incorporados = await driveIdsIncorporados(archivos.map((a) => a.id));

  return (
    <>
      <PageHeader
        title={
          agregarA ? "Agregar archivo desde Drive" : "Incorporar desde Drive"
        }
        description={
          fotoLinea ? (
            "Elegí una imagen liviana (idealmente menos de 300 KB): se muestra en la navegación por máquina."
          ) : agregarA ? (
            <>
              Al documento{" "}
              <strong className="text-foreground">
                {destino?.titulo ?? "sin título"}
              </strong>
            </>
          ) : (
            "Elegí los archivos que entran a la biblioteca. Quedan como borradores para clasificar."
          )
        }
        back={
          agregarA
            ? {
                href: `/admin/documentos/${agregarA}`,
                label: "Volver al documento",
              }
            : undefined
        }
      />

      <nav aria-label="Ubicación" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li>
            <Link
              href={conAgregar({})}
              className="flex min-h-11 items-center px-1 font-medium hover:text-foreground"
            >
              Carpetas raíz
            </Link>
          </li>
          {camino.map((c, i) => (
            <li key={c.id} className="flex items-center gap-1">
              <ChevronRight aria-hidden className="size-4" />
              {i === camino.length - 1 ? (
                <span
                  aria-current="page"
                  className="px-1 font-semibold text-foreground"
                >
                  {c.name}
                </span>
              ) : (
                <Link
                  href={conAgregar({ carpeta: c.id })}
                  className="flex min-h-11 items-center px-1 font-medium hover:text-foreground"
                >
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {carpetas.length > 0 && (
        <ul className="mb-4 flex flex-col divide-y rounded-xl border bg-card">
          {carpetas.map((c) => (
            <li key={c.id}>
              <Link
                href={conAgregar({ carpeta: c.id })}
                className="flex min-h-14 items-center gap-3 px-4 font-semibold hover:bg-accent"
              >
                <FileIcon
                  mimeType={c.mimeType}
                  folder
                  className="text-muted-foreground"
                />
                <span className="min-w-0 flex-1 break-words">{c.name}</span>
                <ChevronRight
                  aria-hidden
                  className="size-5 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archivos.length > 0 ? (
        <SelectionForm fotoLinea={fotoLinea} agregarA={agregarA}>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {archivos.map((a) => {
              const ya = fotoLinea
                ? !isImage(a.mimeType)
                : incorporados.has(a.id);
              return (
                <li key={a.id}>
                  <label
                    className={
                      ya
                        ? "flex min-h-16 items-center gap-3 px-4 py-2 text-muted-foreground"
                        : "flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-accent"
                    }
                  >
                    <input
                      type={fotoLinea ? "radio" : "checkbox"}
                      name={fotoLinea ? "foto" : "archivos"}
                      value={a.id}
                      disabled={ya}
                      className="size-5 shrink-0 accent-brand"
                    />
                    <FileIcon mimeType={a.mimeType} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium break-words text-foreground">
                        {a.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {[
                          formatBytes(a.size),
                          a.modifiedTime && formatFecha(a.modifiedTime),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {ya && !fotoLinea && (
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-800">
                        <CheckCircle2 aria-hidden className="size-4" />
                        Ya incorporado
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </SelectionForm>
      ) : (
        carpetas.length === 0 && (
          <p className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
            <FolderOpen aria-hidden className="size-6" />
            {carpeta
              ? "La carpeta está vacía."
              : "No hay carpetas raíz configuradas."}
          </p>
        )
      )}
    </>
  );
}

/** Formulario según el modo: incorporar archivos o elegir la foto de una línea. */
function SelectionForm({
  fotoLinea,
  agregarA,
  children,
}: {
  fotoLinea?: string;
  agregarA?: string;
  children: React.ReactNode;
}) {
  return fotoLinea ? (
    <FotoLineaForm lineaId={fotoLinea}>{children}</FotoLineaForm>
  ) : (
    <IncorporarForm agregarA={agregarA}>{children}</IncorporarForm>
  );
}
