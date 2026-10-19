/**
 * Validación de destinos de redirección (parámetro `next` del login).
 *
 * @module
 */

/**
 * Devuelve `target` solo si es una ruta interna; evita redirecciones abiertas
 * (`//evil.com`, `/\evil.com`).
 *
 * @param target - Valor recibido (normalmente de un formulario).
 * @param fallback - Ruta si `target` no es válido.
 * @returns Una ruta que empieza con una sola `/`.
 */
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
