import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cuentas, verificaciones } from "@/db/schema";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/mailer";
import { invitationEmail } from "@/lib/mail/templates";
import { auth } from "./auth";

const INVITATION_DAYS = 7;

// La invitación es un token de restablecimiento de Better Auth con vencimiento
// de 7 días: al usarlo, `resetPassword` crea la credencial del usuario.
export async function sendInvitation(usuario: {
  id: string;
  email: string;
  nombre: string;
}) {
  const ctx = await auth.$context;
  const token = randomBytes(32).toString("base64url");

  // Un link vigente por usuario: reenviar invalida los anteriores.
  await db.delete(verificaciones).where(eq(verificaciones.value, usuario.id));
  await ctx.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: usuario.id,
    expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
  });

  const url = `${env().APP_URL}/invitacion/${token}`;
  await sendMail({
    to: usuario.email,
    ...invitationEmail({ nombre: usuario.nombre, url }),
  });
}

/** Usuario dueño de un token de invitación o restablecimiento vigente, o null. */
export async function findUsuarioIdByToken(token: string) {
  const ctx = await auth.$context;
  const verification = await ctx.internalAdapter.findVerificationValue(
    `reset-password:${token}`,
  );
  if (!verification || verification.expiresAt < new Date()) return null;
  return verification.value;
}

export async function hasPassword(usuarioId: string) {
  const [cuenta] = await db
    .select({ id: cuentas.id })
    .from(cuentas)
    .where(eq(cuentas.userId, usuarioId))
    .limit(1);
  return Boolean(cuenta);
}
