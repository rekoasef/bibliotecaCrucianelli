"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import type { FormState } from "@/components/forms/form-state";
import { auth, USUARIO_INACTIVO } from "@/lib/auth/auth";
import { findUsuarioIdByToken } from "@/lib/auth/invitations";
import { formatRetryAfter, hit, rateLimits, reset } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { safeRedirectPath } from "@/lib/safe-redirect";

const MSG_INACTIVO =
  "Tu usuario está desactivado. Consultá con el responsable de la biblioteca.";

function isInactiveError(error: APIError) {
  return (
    error.message === USUARIO_INACTIVO ||
    error.body?.message === USUARIO_INACTIVO
  );
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Ingresá tu email y tu contraseña.", values };
  }
  const { email, password } = parsed.data;

  const ip = await getClientIp();
  const limits = await Promise.all([
    hit(`login:email:${email}`, rateLimits.loginEmail),
    hit(`login:ip:${ip}`, rateLimits.loginIp),
  ]);
  const blocked = limits.find((l) => !l.allowed);
  if (blocked) {
    return {
      error: `Demasiados intentos. Probá de nuevo en ${formatRetryAfter(blocked.retryAfterSeconds)}.`,
      values,
    };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password, rememberMe: true },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      if (isInactiveError(error)) return { error: MSG_INACTIVO, values };
      return { error: "Email o contraseña incorrectos.", values };
    }
    throw error;
  }

  await reset(`login:email:${email}`);
  redirect(safeRedirectPath(formData.get("next")));
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: ["Ingresá un email válido."] }, values };
  }
  const email = parsed.data;

  const ip = await getClientIp();
  const limits = await Promise.all([
    hit(`reset:email:${email}`, rateLimits.passwordResetEmail),
    hit(`reset:ip:${ip}`, rateLimits.passwordResetIp),
  ]);
  const blocked = limits.find((l) => !l.allowed);
  if (blocked) {
    return {
      error: `Demasiados pedidos. Probá de nuevo en ${formatRetryAfter(blocked.retryAfterSeconds)}.`,
      values,
    };
  }

  try {
    await auth.api.requestPasswordReset({ body: { email } });
  } catch (error) {
    // Se registra pero no se muestra: un error distinto revelaría que el email existe.
    console.error("No se pudo enviar el mail de restablecimiento", error);
  }

  // Mismo mensaje exista o no el email, para no revelar quién tiene usuario.
  return {
    success:
      "Si el email corresponde a un usuario, te enviamos un link para elegir una nueva contraseña. Revisá tu correo (y la carpeta de spam).",
  };
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
      .max(128, "La contraseña es demasiado larga."),
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

/** Define la contraseña con un token de invitación o de restablecimiento, e inicia sesión. */
export async function setPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const usuarioId = await findUsuarioIdByToken(token);
  if (!usuarioId) {
    return { error: "El link venció o ya se usó. Pedí uno nuevo." };
  }

  try {
    await auth.api.resetPassword({
      body: { token, newPassword: parsed.data.password },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "El link venció o ya se usó. Pedí uno nuevo." };
    }
    throw error;
  }

  // Usar el link del mail prueba que el email es suyo.
  const [usuario] = await db
    .update(usuarios)
    .set({ emailVerificado: true })
    .where(eq(usuarios.id, usuarioId))
    .returning({ email: usuarios.email });

  try {
    await auth.api.signInEmail({
      body: {
        email: usuario.email,
        password: parsed.data.password,
        rememberMe: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && isInactiveError(error)) {
      return { error: MSG_INACTIVO };
    }
    throw error;
  }

  redirect("/");
}
