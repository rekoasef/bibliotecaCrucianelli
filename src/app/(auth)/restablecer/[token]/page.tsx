/**
 * `/restablecer/[token]`: elegir una nueva contraseña.
 *
 * @module
 */

import type { Metadata } from "next";
import { findUsuarioIdByToken } from "@/lib/auth/invitations";
import { AuthCard } from "../../auth-card";
import { InvalidLink } from "../../invalid-link";
import { SetPasswordForm } from "../../set-password-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

/**
 * Formulario para la nueva contraseña, o aviso si el link venció o ya se usó.
 */
export default async function ResetPasswordPage({
  params,
}: PageProps<"/restablecer/[token]">) {
  const { token } = await params;

  if (!(await findUsuarioIdByToken(token))) {
    return (
      <InvalidLink description="El link venció (dura 1 hora) o ya se usó." />
    );
  }

  return (
    <AuthCard title="Elegí una nueva contraseña">
      <SetPasswordForm token={token} submitLabel="Guardar e ingresar" />
    </AuthCard>
  );
}
