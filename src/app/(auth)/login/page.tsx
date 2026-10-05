import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeRedirectPath(next);
  if (await getCurrentUser()) redirect(target);

  return (
    <AuthCard
      title="Ingresar"
      description="Usá el email y la contraseña de tu usuario de la biblioteca."
    >
      <LoginForm next={target === "/" ? undefined : target} />
    </AuthCard>
  );
}
