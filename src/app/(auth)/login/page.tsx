import type { Metadata } from "next";
import Link from "next/link";
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
      description="Para concesionarios y personal de fábrica: usá el email y la contraseña de tu usuario de la biblioteca."
    >
      <LoginForm next={target === "/" ? undefined : target} />
      <p className="border-t pt-4 text-muted-foreground">
        ¿Sos cliente?{" "}
        <Link
          href="/"
          className="font-medium text-brand-strong underline underline-offset-4"
        >
          Entrá sin cuenta
        </Link>{" "}
        a la documentación para clientes.
      </p>
    </AuthCard>
  );
}
