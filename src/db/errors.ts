/**
 * Interpretación de errores de Postgres.
 *
 * @module
 */

/**
 * Error de Postgres (postgres.js), también cuando Drizzle lo envuelve en
 * `cause`.
 *
 * @param error - Error capturado.
 * @returns El error con `code` y `constraint_name`, o `undefined`.
 */
function findPgError(
  error: unknown,
): { code?: string; constraint_name?: string } | undefined {
  let current: unknown = error;
  for (let i = 0; i < 3 && current; i++) {
    if (typeof current === "object" && "code" in current) {
      return current as { code?: string; constraint_name?: string };
    }
    current =
      typeof current === "object" && "cause" in current
        ? current.cause
        : undefined;
  }
  return undefined;
}

/**
 * Violación de UNIQUE (código 23505).
 *
 * @param error - Error capturado.
 */
export function isUniqueViolation(error: unknown): boolean {
  return findPgError(error)?.code === "23505";
}

/**
 * Nombre de la restricción UNIQUE violada, para mostrar el error en el campo
 * correcto.
 *
 * @param error - Error capturado.
 * @returns El nombre de la restricción, o `undefined` si no es una violación de
 *   UNIQUE.
 */
export function uniqueViolationConstraint(error: unknown): string | undefined {
  const pg = findPgError(error);
  return pg?.code === "23505" ? pg.constraint_name : undefined;
}
