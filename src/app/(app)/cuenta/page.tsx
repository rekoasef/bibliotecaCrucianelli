import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { ROL_LABEL } from "@/lib/labels";
import { logout } from "../../(auth)/actions";
import { NombreForm, PasswordForm } from "./account-forms";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Mi cuenta
      </h1>

      <section className="flex flex-col gap-1 rounded-xl border bg-card p-5">
        <p className="text-lg font-semibold">{user.nombre}</p>
        <p className="break-all text-muted-foreground">{user.email}</p>
        <p className="text-muted-foreground">
          {ROL_LABEL[user.rol]}
          {user.concesionarioNombre && ` · ${user.concesionarioNombre}`}
        </p>
      </section>

      <AccountSection title="Datos">
        <NombreForm nombre={user.nombre} />
      </AccountSection>

      <AccountSection title="Cambiar contraseña">
        <PasswordForm />
      </AccountSection>

      <form action={logout}>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
        >
          <LogOut aria-hidden className="size-5" />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}

function AccountSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
