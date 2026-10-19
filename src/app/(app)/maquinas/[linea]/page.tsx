/**
 * `/maquinas/[linea]`: documentos de una línea.
 *
 * @module
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { getViewer } from "@/lib/auth/session";
import { getSearchOptions } from "@/lib/search/options";
import { MaquinaView } from "../maquina-view";

/** Título con el nombre de la línea. */
export async function generateMetadata({
  params,
}: PageProps<"/maquinas/[linea]">): Promise<Metadata> {
  const { linea } = await params;
  const [row] = await db
    .select({ nombre: lineas.nombre })
    .from(lineas)
    .where(eq(lineas.slug, linea));
  return { title: row?.nombre ?? "Máquina" };
}

/**
 * Página de la línea ({@link MaquinaView}); 404 si no existe o no es visible
 * para el lector.
 */
export default async function LineaPage({
  params,
}: PageProps<"/maquinas/[linea]">) {
  const { viewer } = await getViewer();
  const { linea: slug } = await params;
  // Solo líneas visibles para el usuario (activas, salvo para el admin).
  const { maquinas } = await getSearchOptions(viewer);
  const linea = maquinas.flatMap((s) => s.lineas).find((l) => l.slug === slug);
  if (!linea) notFound();

  const [row] = await db
    .select({ foto: lineas.imagenDriveFileId })
    .from(lineas)
    .where(eq(lineas.id, linea.id));
  return (
    <MaquinaView viewer={viewer} linea={linea} tieneFoto={Boolean(row?.foto)} />
  );
}
