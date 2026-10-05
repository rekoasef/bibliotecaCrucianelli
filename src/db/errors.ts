/** Error de Postgres (postgres.js), también cuando Drizzle lo envuelve en `cause`. */
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

/** Violación de UNIQUE (23505). */
export function isUniqueViolation(error: unknown): boolean {
  return findPgError(error)?.code === "23505";
}

/** Nombre de la restricción UNIQUE violada, para mostrar el error en el campo correcto. */
export function uniqueViolationConstraint(error: unknown): string | undefined {
  const pg = findPgError(error);
  return pg?.code === "23505" ? pg.constraint_name : undefined;
}
