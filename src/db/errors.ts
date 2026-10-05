/** Violación de UNIQUE en Postgres (23505), también cuando Drizzle envuelve el error. */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 3 && current; i++) {
    if (
      typeof current === "object" &&
      "code" in current &&
      current.code === "23505"
    )
      return true;
    current =
      typeof current === "object" && "cause" in current
        ? current.cause
        : undefined;
  }
  return false;
}
