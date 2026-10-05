"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Fila de lista con un botón "Editar" que despliega el contenido debajo. */
export function ExpandableRow({
  row,
  label,
  children,
}: {
  row: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <div className="flex items-center gap-1">
        {row}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={`Editar ${label}`}
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-3 font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Editar
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {/* hidden en vez de desmontar: conserva lo escrito y el resultado del formulario */}
      <div
        id={id}
        hidden={!open}
        className="mt-2 flex flex-col gap-4 rounded-lg bg-background p-4"
      >
        {children}
      </div>
    </>
  );
}
