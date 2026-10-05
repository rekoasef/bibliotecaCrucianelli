"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Comparte el link de la ficha: quien lo abra igual necesita sesión y permiso. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // el usuario canceló
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button type="button" variant="outline" onClick={share}>
      {copied ? (
        <Check aria-hidden className="size-5" />
      ) : (
        <Share2 aria-hidden className="size-5" />
      )}
      <span aria-live="polite">{copied ? "Link copiado" : "Compartir"}</span>
    </Button>
  );
}
