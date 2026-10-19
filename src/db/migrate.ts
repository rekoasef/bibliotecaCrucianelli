/**
 * Aplica las migraciones pendientes de `src/db/migrations`. En producción lo
 * corre el servicio `migrate` de docker-compose.prod.yml antes de levantar la
 * app.
 *
 * @module
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Conecta con `DATABASE_URL`, migra y cierra la conexión. */
async function main() {
  const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    onnotice: () => {},
  });
  await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  await client.end();
  console.info("Migraciones aplicadas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
