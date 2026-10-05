import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthCard
        title="Olvidé mi contraseña"
        description="Te mandamos un link a tu email para que elijas una nueva."
      >
        <ForgotForm />
      </AuthCard>
      <BackToLogin />
    </>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="-mt-4 flex min-h-11 items-center justify-center font-medium text-brand-strong underline-offset-4 hover:underline"
    >
      Volver a ingresar
    </Link>
  );
}
