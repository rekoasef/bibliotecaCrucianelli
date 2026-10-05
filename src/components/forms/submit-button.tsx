"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

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
