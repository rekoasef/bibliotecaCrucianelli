"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Panel inferior (bottom sheet) con los filtros, solo en celular (docs/05).
 * Se cierra solo al aplicar porque la página lo monta con un `key` que cambia con
 * los filtros (cerrarlo en el submit sacaría el form del DOM antes de enviarlo).
 */
export function FiltersSheet({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal aria-hidden className="size-5" />
        Filtros{activeCount > 0 && ` (${activeCount})`}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            aria-hidden
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-in flex-col rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl duration-200 slide-in-from-bottom"
          >
            <div className="flex items-center justify-between border-b px-4 py-2">
              <h2 id={titleId} className="text-lg font-bold">
                Filtros
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Cerrar filtros"
                autoFocus
              >
                <X aria-hidden className="size-6" />
              </Button>
            </div>
            <div className="overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
