import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  concesionarios,
  cuentas,
  sesiones,
  usuarios,
  verificaciones,
} from "@/db/schema";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/mailer";
import { passwordResetEmail } from "@/lib/mail/templates";

/** Usuario activo y, si es de concesionario, con el concesionario activo. */
export async function isUsuarioHabilitado(usuarioId: string) {
  const [row] = await db
    .select({
      activo: usuarios.activo,
      concesionarioActivo: concesionarios.activo,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(eq(usuarios.id, usuarioId));
  return Boolean(row?.activo && row.concesionarioActivo !== false);
}

export const USUARIO_INACTIVO = "USUARIO_INACTIVO";

// La app no expone el handler HTTP de Better Auth (/api/auth/*): todo pasa por
// Server Actions que llaman a `auth.api.*` y aplican nuestro rate limiting.
export const auth = betterAuth({
  baseURL: env().APP_URL,
  secret: env().BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { usuarios, sesiones, cuentas, verificaciones },
  }),
  user: {
    modelName: "usuarios",
    fields: {
      name: "nombre",
      emailVerified: "emailVerificado",
      image: "imagen",
      createdAt: "creadoEn",
      updatedAt: "actualizadoEn",
    },
    // Columnas propias de `usuarios`. Los usuarios los crea el admin, nunca la librería.
    additionalFields: {
      rol: {
        type: ["admin", "fabrica", "concesionario"],
        required: true,
        input: false,
      },
    },
  },
  session: {
    modelName: "sesiones",
    // Los mecánicos entran desde el campo: sesión larga, renovada con el uso.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "cuentas" },
  verification: {
    modelName: "verificaciones",
    storeIdentifier: "hashed",
  },
  advanced: {
    database: { generateId: "uuid" },
    cookiePrefix: "biblioteca",
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // sin registro público: el admin crea los usuarios
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      if (!(await isUsuarioHabilitado(user.id))) return;
      const url = `${env().APP_URL}/restablecer/${token}`;
      await sendMail({
        to: user.email,
        ...passwordResetEmail({ nombre: user.name, url }),
      });
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Bloqueo de usuarios y concesionarios inactivos al iniciar sesión.
        before: async (session) => {
          if (!(await isUsuarioHabilitado(session.userId))) {
            throw new APIError("FORBIDDEN", { message: USUARIO_INACTIVO });
          }
        },
        after: async (session) => {
          await db
            .update(usuarios)
            .set({ ultimoIngreso: new Date() })
            .where(eq(usuarios.id, session.userId));
        },
      },
    },
  },
  plugins: [nextCookies()],
});
