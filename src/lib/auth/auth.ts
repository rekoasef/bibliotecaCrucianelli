import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq, isNull } from "drizzle-orm";
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
import { superaInactividad } from "./inactividad";

export const USUARIO_INACTIVO = "USUARIO_INACTIVO";
export const USUARIO_PAUSADO = "USUARIO_PAUSADO";

/**
 * Si el usuario puede usar la app: activo, con el concesionario activo (si es de
 * concesionario) y sin pausa por inactividad. Si recién superó el plazo de
 * inactividad, guarda la pausa (queda así hasta que el admin la levante).
 */
export async function estadoAcceso(
  usuarioId: string,
): Promise<"ok" | typeof USUARIO_INACTIVO | typeof USUARIO_PAUSADO> {
  const [row] = await db
    .select({
      rol: usuarios.rol,
      activo: usuarios.activo,
      pausadoEn: usuarios.pausadoEn,
      ultimaActividad: usuarios.ultimaActividad,
      ultimoIngreso: usuarios.ultimoIngreso,
      concesionarioActivo: concesionarios.activo,
    })
    .from(usuarios)
    .leftJoin(concesionarios, eq(usuarios.concesionarioId, concesionarios.id))
    .where(eq(usuarios.id, usuarioId));
  if (!row?.activo || row.concesionarioActivo === false)
    return USUARIO_INACTIVO;
  if (row.pausadoEn) return USUARIO_PAUSADO;
  if (superaInactividad(row, env().INACTIVIDAD_DIAS, new Date())) {
    await pausarUsuario(usuarioId);
    return USUARIO_PAUSADO;
  }
  return "ok";
}

/** Marca la pausa por inactividad y cierra sus sesiones. */
export async function pausarUsuario(usuarioId: string) {
  await db
    .update(usuarios)
    .set({ pausadoEn: new Date() })
    .where(and(eq(usuarios.id, usuarioId), isNull(usuarios.pausadoEn)));
  await db.delete(sesiones).where(eq(sesiones.userId, usuarioId));
}

export async function isUsuarioHabilitado(usuarioId: string) {
  return (await estadoAcceso(usuarioId)) === "ok";
}

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
        // Bloqueo de usuarios y concesionarios inactivos, y de cuentas pausadas
        // por inactividad, al iniciar sesión.
        before: async (session) => {
          const estado = await estadoAcceso(session.userId);
          if (estado !== "ok") {
            throw new APIError("FORBIDDEN", { message: estado });
          }
        },
        after: async (session) => {
          const ahora = new Date();
          await db
            .update(usuarios)
            .set({ ultimoIngreso: ahora, ultimaActividad: ahora })
            .where(eq(usuarios.id, session.userId));
        },
      },
    },
  },
  plugins: [nextCookies()],
});
