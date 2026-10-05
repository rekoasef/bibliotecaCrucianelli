import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lineas, modelos } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getSearchOptions } from "@/lib/search/options";
import { MaquinaView } from "../../maquina-view";

export async function generateMetadata({
  params,
}: PageProps<"/maquinas/[linea]/[modelo]">): Promise<Metadata> {
  const { modelo } = await params;
  const [row] = await db
    .select({ nombre: modelos.nombre })
    .from(modelos)
    .where(eq(modelos.slug, modelo));
  return { title: row?.nombre ?? "Máquina" };
}

export default async function ModeloPage({
  params,
}: PageProps<"/maquinas/[linea]/[modelo]">) {
  const user = await requireUser();
  const { linea: lineaSlug, modelo: modeloSlug } = await params;
  const { maquinas } = await getSearchOptions(user);
  const linea = maquinas
    .flatMap((s) => s.lineas)
    .find((l) => l.slug === lineaSlug);
  const modelo = linea?.modelos.find((m) => m.slug === modeloSlug);
  if (!linea || !modelo) notFound();

  const [row] = await db
    .select({ foto: lineas.imagenDriveFileId })
    .from(lineas)
    .where(eq(lineas.id, linea.id));
  return (
    <MaquinaView
      user={user}
      linea={linea}
      modelo={modelo}
      tieneFoto={Boolean(row?.foto)}
    />
  );
}
