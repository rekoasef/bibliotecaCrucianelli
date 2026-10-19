/**
 * Guarda de los tests de base: importar primero en cada test que use `@/db`.
 *
 * Los tests de base corren contra el Postgres de desarrollo. Sin
 * `DATABASE_URL`, postgres.js se conectaría a localhost:5432 con el usuario del
 * sistema (a cualquier otra base local) y fallaría con errores confusos ("no
 * existe la relación…").
 *
 * @module
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL: copiá .env.example a .env y levantá la base con `npm run db:up` y `npm run db:migrate`.",
  );
}
