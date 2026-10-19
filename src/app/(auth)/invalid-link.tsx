/**
 * Aviso de link vencido o usado.
 *
 * @module
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthCard } from "./auth-card";

/**
 * Link de invitación o restablecimiento inválido, con el botón para pedir uno
 * nuevo.
 *
 * @param props - `description`: motivo y qué hacer.
 */
export function InvalidLink({ description }: { description: string }) {
  return (
    <AuthCard title="El link no es válido" description={description}>
      <Button asChild size="lg">
        <Link href="/olvide-contrasena">Pedir un link nuevo</Link>
      </Button>
    </AuthCard>
  );
}
