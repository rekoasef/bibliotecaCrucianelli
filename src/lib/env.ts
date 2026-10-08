import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.url(),
  ADMIN_EMAIL: z.email().optional().or(z.literal("")),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Sin SMTP, mostrar los mails en la consola también en modo producción (pruebas locales).
  MAIL_TO_CONSOLE: z.stringbool().default(false),
  // Días sin usar la app tras los cuales la cuenta se pausa (0 = nunca).
  INACTIVIDAD_DIAS: z.coerce.number().int().min(0).default(90),
});

// Se valida al primer uso. Durante `next build` (imagen Docker) no hay secretos:
// se usan valores de relleno que nunca llegan a producción, porque en runtime
// NEXT_PHASE no es "phase-production-build" y se exigen los reales.
let cached: z.infer<typeof schema> | undefined;

const BUILD_PLACEHOLDERS = {
  DATABASE_URL: "postgres://build:build@localhost:5432/build",
  BETTER_AUTH_SECRET: "build-placeholder-secret-not-used-at-runtime",
  APP_URL: "http://localhost:3000",
};

export function env() {
  if (!cached) {
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const parsed = schema.safeParse(
      isBuild ? { ...BUILD_PLACEHOLDERS, ...process.env } : process.env,
    );
    if (!parsed.success) {
      throw new Error(
        `Variables de entorno inválidas: ${z.prettifyError(parsed.error)}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
