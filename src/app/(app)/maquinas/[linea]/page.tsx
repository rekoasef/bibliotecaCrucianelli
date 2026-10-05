import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lineas } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getSearchOptions } from "@/lib/search/options";
import { MaquinaView } from "../maquina-view";

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

export default async function LineaPage({
  params,
}: PageProps<"/maquinas/[linea]">) {
  const user = await requireUser();
  const { linea: slug } = await params;
  // Solo líneas visibles para el usuario (activas, salvo para el admin).
  const { maquinas } = await getSearchOptions(user);
  const linea = maquinas.flatMap((s) => s.lineas).find((l) => l.slug === slug);
  if (!linea) notFound();

  const [row] = await db
    .select({ foto: lineas.imagenDriveFileId })
    .from(lineas)
    .where(eq(lineas.id, linea.id));
  return (
    <MaquinaView user={user} linea={linea} tieneFoto={Boolean(row?.foto)} />
  );
}
