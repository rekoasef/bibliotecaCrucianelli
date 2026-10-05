import type { Metadata } from "next";
import { findUsuarioIdByToken } from "@/lib/auth/invitations";
import { AuthCard } from "../../auth-card";
import { InvalidLink } from "../../invalid-link";
import { SetPasswordForm } from "../../set-password-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

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
