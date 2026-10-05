// Seed inicial: admin desde ADMIN_EMAIL (docs/03). Idempotente: se puede correr varias veces.
// Corre con `npm run db:seed` (condición react-server para poder importar módulos "server-only").
import "dotenv/config";
import { eq } from "drizzle-orm";
import { sendInvitation } from "@/lib/auth/invitations";
import { db } from "./index";
import { usuarios } from "./schema";

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

async function main() {
  await seedAdmin();
  // TODO(Fase 2): segmentos, líneas, modelos y taxonomía (docs/04).
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
