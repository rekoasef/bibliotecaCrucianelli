import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

type Rule = { max: number; windowSeconds: number };

export const rateLimits = {
  loginEmail: { max: 5, windowSeconds: 15 * 60 },
  loginIp: { max: 30, windowSeconds: 15 * 60 },
  passwordResetEmail: { max: 3, windowSeconds: 60 * 60 },
  passwordResetIp: { max: 10, windowSeconds: 60 * 60 },
  invitationResend: { max: 5, windowSeconds: 60 * 60 },
  // Archivos abiertos sin cuenta (clientes): cuida el ancho de banda de la VPS.
  // Generoso porque muchos celulares salen por la misma IP de la operadora.
  archivosClienteIp: { max: 200, windowSeconds: 60 * 60 },
  // Búsquedas sin cuenta: cada una consulta la base y se registra; frena bots
  // que buscan sin parar (inflan los registros y cargan Postgres).
  busquedasClienteIp: { max: 300, windowSeconds: 60 * 60 },
} satisfies Record<string, Rule>;

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Cuenta un intento para `key` en una ventana fija. Atómico en Postgres, así
 * funciona aunque haya varias instancias de la app y sobrevive a reinicios.
 */
export async function hit(key: string, rule: Rule): Promise<RateLimitResult> {
  const window = `${rule.windowSeconds} seconds`;
  const rows = await db.execute<{ cantidad: number; restante: number }>(sql`
    INSERT INTO limites_tasa (clave, cantidad, ventana_inicio)
    VALUES (${key}, 1, now())
    ON CONFLICT (clave) DO UPDATE SET
      cantidad = CASE WHEN limites_tasa.ventana_inicio < now() - ${window}::interval
                      THEN 1 ELSE limites_tasa.cantidad + 1 END,
      ventana_inicio = CASE WHEN limites_tasa.ventana_inicio < now() - ${window}::interval
                            THEN now() ELSE limites_tasa.ventana_inicio END
    RETURNING cantidad,
      ceil(extract(epoch FROM limites_tasa.ventana_inicio + ${window}::interval - now()))::int AS restante
  `);

  // Limpieza ocasional de ventanas viejas, sin tarea programada.
  if (Math.random() < 0.01) {
    await db.execute(
      sql`DELETE FROM limites_tasa WHERE ventana_inicio < now() - interval '1 day'`,
    );
  }

  const { cantidad, restante } = rows[0];
  return {
    allowed: cantidad <= rule.max,
    retryAfterSeconds: Math.max(restante, 0),
  };
}

export async function reset(key: string) {
  await db.execute(sql`DELETE FROM limites_tasa WHERE clave = ${key}`);
}

export function formatRetryAfter(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "1 minuto" : `${minutes} minutos`;
}
