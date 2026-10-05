/** Devuelve `target` solo si es una ruta interna; evita redirecciones abiertas (`//evil.com`). */
export function safeRedirectPath(target: unknown, fallback = "/") {
  if (typeof target !== "string") return fallback;
  if (
    !target.startsWith("/") ||
    target.startsWith("//") ||
    target.startsWith("/\\")
  ) {
    return fallback;
  }
  return target;
}
