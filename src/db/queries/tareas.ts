import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tareas } from "@/db/schema";

export async function getTarea(nombre: string) {
  const [row] = await db.select().from(tareas).where(eq(tareas.nombre, nombre));
  return row ?? null;
}
