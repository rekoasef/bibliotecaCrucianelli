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
});

// Se valida al primer uso para que `next build` no exija secretos.
let cached: z.infer<typeof schema> | undefined;

export function env() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Variables de entorno inválidas: ${z.prettifyError(parsed.error)}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
