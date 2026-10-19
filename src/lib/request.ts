/**
 * Datos del request HTTP actual.
 *
 * @module
 */

import "server-only";
import { headers } from "next/headers";

/**
 * IP del cliente, para el rate limiting.
 *
 * @returns La primera IP de `X-Forwarded-For`, o `X-Real-IP`, o
 *   `"desconocida"`.
 * @remarks En producción la app está detrás de un proxy (Caddy o el Nginx de la
 *   VPS) que **reemplaza** `X-Forwarded-For` con la IP real (deploy/README.md);
 *   así el cliente no puede falsearla.
 */
export async function getClientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
}
