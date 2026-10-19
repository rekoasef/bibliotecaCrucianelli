/**
 * Botón de envío con estado de carga.
 *
 * @module
 */

"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Botón de envío que se deshabilita y muestra un spinner mientras el formulario
 * se envía (`useFormStatus`).
 *
 * @param props - Props de `Button`; `pendingLabel` reemplaza al texto mientras
 *   envía.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
