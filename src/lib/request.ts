import "server-only";
import { headers } from "next/headers";

/** IP del cliente. En producción la app está detrás del proxy (Caddy), que setea X-Forwarded-For. */
export async function getClientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocida"
  );
}
