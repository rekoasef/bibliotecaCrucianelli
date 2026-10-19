/**
 * Botones para reordenar listas del admin.
 *
 * @module
 */

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props de {@link MoveButtons}: Server Action, campos ocultos, nombre del ítem
 * (para la etiqueta accesible) y si es el primero o el último.
 */
type Props = {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  isFirst: boolean;
  isLast: boolean;
};

/**
 * Botones ↑ ↓ para reordenar: táctiles y sin JavaScript (cada uno es un form
 * que envía `direction`).
 *
 * @param props - Ver `Props`.
 */
export function MoveButtons({ action, fields, label, isFirst, isLast }: Props) {
  return (
    <div className="flex shrink-0">
      {(["up", "down"] as const).map((direction) => {
        const disabled = direction === "up" ? isFirst : isLast;
        const Icon = direction === "up" ? ArrowUp : ArrowDown;
        return (
          <form key={direction} action={action}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input type="hidden" name="direction" value={direction} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`${direction === "up" ? "Subir" : "Bajar"} ${label}`}
            >
              <Icon aria-hidden className="size-5" />
            </Button>
          </form>
        );
      })}
    </div>
  );
}
