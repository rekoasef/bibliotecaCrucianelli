import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** <select> nativo con el estilo de los inputs: en el celular abre el selector del sistema. */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="h-11 w-full appearance-none rounded-lg border border-input bg-card pr-10 pl-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
