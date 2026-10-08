import { cn } from "@/lib/utils";

/**
 * Doble trazo del isotipo de Crucianelli: dos barras paralelas inclinadas.
 * Marca los nombres de máquina (como las calcos) y lo activo en la navegación.
 */
export function DobleTrazo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 14 16"
      className={cn("h-4 w-3.5 shrink-0 fill-brand", className)}
    >
      <path d="M5 0h4L4 16H0z" />
      <path d="M10 0h4L9 16H5z" />
    </svg>
  );
}
