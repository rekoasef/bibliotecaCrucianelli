import type { Metadata } from "next";
import { findUsuarioIdByToken } from "@/lib/auth/invitations";
import { AuthCard } from "../../auth-card";
import { InvalidLink } from "../../invalid-link";
import { SetPasswordForm } from "../../set-password-form";

export const metadata: Metadata = { title: "Aceptar invitación" };

export default async function InvitationPage({
  params,
}: PageProps<"/invitacion/[token]">) {
  const { token } = await params;

  if (!(await findUsuarioIdByToken(token))) {
    return (
      <InvalidLink description="La invitación venció (dura 7 días) o ya se usó. Si ya definiste tu contraseña, podés ingresar; si no, pedí un link nuevo con tu email." />
    );
  }

  return (
    <AuthCard
      title="Bienvenido a la biblioteca técnica"
      description="Elegí una contraseña para tu usuario. Después vas a entrar directamente."
    >
      <SetPasswordForm token={token} submitLabel="Guardar e ingresar" />
    </AuthCard>
  );
}
