import { Badge } from "@/components/ui/badge";
import type { EstadoDoc } from "@/db/schema";
import { cn } from "@/lib/utils";

const ESTADOS: Record<EstadoDoc, { label: string; className: string }> = {
  borrador: {
    label: "Borrador",
    className: "border-amber-700/30 bg-amber-50 text-amber-900",
  },
  vigente: {
    label: "Vigente",
    className: "border-emerald-700/30 bg-emerald-50 text-emerald-900",
  },
  obsoleto: {
    label: "Obsoleto",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function EstadoDocBadge({ estado }: { estado: EstadoDoc }) {
  const { label, className } = ESTADOS[estado];
  return (
    <Badge variant="outline" className={cn("h-7 px-2.5 text-sm", className)}>
      {label}
    </Badge>
  );
}
