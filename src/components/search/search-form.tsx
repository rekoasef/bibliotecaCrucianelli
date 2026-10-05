import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DesktopAutoFocus } from "./desktop-autofocus";

type SearchFormProps = {
  defaultValue?: string;
  size?: "default" | "lg";
  autoFocusOnDesktop?: boolean;
  className?: string;
};

// Formulario GET común: funciona sin JavaScript y deja la búsqueda en la URL (docs/05).
export function SearchForm({
  defaultValue,
  size = "default",
  autoFocusOnDesktop = false,
  className,
}: SearchFormProps) {
  const inputId = "buscar-q";
  const large = size === "lg";

  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className={cn("flex gap-2", className)}
    >
      <label htmlFor={inputId} className="sr-only">
        Buscar documentación
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground",
            large ? "size-6" : "size-5",
          )}
        />
        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="Ej.: dosificador Gringa"
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "w-full rounded-xl border border-input bg-card pr-3 text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none",
            large ? "h-14 pl-12 text-lg" : "h-11 pl-11 text-base",
          )}
        />
      </div>
      <Button
        type="submit"
        size={large ? "lg" : "default"}
        className={cn(large && "h-14 px-6")}
      >
        Buscar
      </Button>
      {autoFocusOnDesktop && <DesktopAutoFocus targetId={inputId} />}
    </form>
  );
}
