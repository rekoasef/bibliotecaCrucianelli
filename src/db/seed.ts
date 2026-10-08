// Seed inicial: admin desde ADMIN_EMAIL (docs/03). Idempotente: se puede correr varias veces.
// Corre con `npm run db:seed` (condición react-server para poder importar módulos "server-only").
import "dotenv/config";
import { eq } from "drizzle-orm";
import { sendInvitation } from "@/lib/auth/invitations";
import { slugify } from "@/lib/text";
import { db } from "./index";
import {
  SEED_MAQUINAS,
  SEED_SISTEMAS,
  SEED_TECNOLOGIAS,
  SEED_PRODUCTOS,
  SEED_TEMAS,
  SEED_TIPOS,
} from "./seed-data";
import {
  lineas,
  modelos,
  productos,
  segmentos,
  sistemas,
  tecnologias,
  temas,
  tipos,
  usuarios,
} from "./schema";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.warn("ADMIN_EMAIL vacío: no se crea el admin inicial.");
    return;
  }

  const [existente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email));
  if (existente) {
    console.info(`El admin ${email} ya existe.`);
    return;
  }

  const [admin] = await db
    .insert(usuarios)
    .values({ nombre: "Administrador", email, rol: "admin" })
    .returning();
  await sendInvitation(admin);
  console.info(`Admin ${email} creado. Se envió la invitación.`);
}

// Inserta solo lo que falta (por slug): no pisa cambios hechos desde el panel.
async function seedMaquinas() {
  for (const [i, s] of SEED_MAQUINAS.entries()) {
    await db
      .insert(segmentos)
      .values({
        nombre: s.segmento,
        slug: slugify(s.segmento),
        orden: i,
        activo: s.activo,
      })
      .onConflictDoNothing();
    const [segmento] = await db
      .select()
      .from(segmentos)
      .where(eq(segmentos.slug, slugify(s.segmento)));

    for (const [j, l] of s.lineas.entries()) {
      await db
        .insert(lineas)
        .values({
          segmentoId: segmento.id,
          nombre: l.nombre,
          slug: slugify(l.nombre),
          orden: j,
        })
        .onConflictDoNothing();
      const [linea] = await db
        .select()
        .from(lineas)
        .where(eq(lineas.slug, slugify(l.nombre)));

      for (const [k, m] of l.modelos.entries()) {
        await db
          .insert(modelos)
          .values({ lineaId: linea.id, nombre: m, slug: slugify(m), orden: k })
          .onConflictDoNothing();
      }
    }
  }
  console.info("Máquinas: listo.");
}

async function seedCatalogos() {
  const catalogos = [
    [tipos, SEED_TIPOS],
    [sistemas, SEED_SISTEMAS],
    [temas, SEED_TEMAS],
    [productos, SEED_PRODUCTOS],
    [tecnologias, SEED_TECNOLOGIAS],
  ] as const;
  for (const [tabla, nombres] of catalogos) {
    await db
      .insert(tabla)
      .values(
        nombres.map((nombre, orden) => ({
          nombre,
          slug: slugify(nombre),
          orden,
        })),
      )
      .onConflictDoNothing();
  }
  console.info("Tipos, sistemas, temas, productos y tecnologías: listo.");
}

async function main() {
  await seedAdmin();
  await seedMaquinas();
  await seedCatalogos();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
