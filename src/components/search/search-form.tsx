import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DesktopAutoFocus } from "./desktop-autofocus";

type SearchFormProps = {
  defaultValue?: string;
  size?: "default" | "lg";
  autoFocusOnDesktop?: boolean;
  className?: string;
  /** Filtros que se conservan al buscar otro texto (ej.: la máquina en su página). */
  hidden?: Record<string, string | undefined>;
  placeholder?: string;
  label?: string;
  /** "franja": sobre el rojo de la cabecera (botón pizarra para que no se pierda). */
  tone?: "default" | "franja";
};

// Formulario GET común: funciona sin JavaScript y deja la búsqueda en la URL (docs/05).
export function SearchForm({
  defaultValue,
  size = "default",
  autoFocusOnDesktop = false,
  className,
  hidden = {},
  placeholder = "Ej.: dosificador Gringa",
  label = "Buscar documentación",
  tone = "default",
}: SearchFormProps) {
  const inputId = "buscar-q";
  const large = size === "lg";
  const franja = tone === "franja";

  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className={cn("flex gap-2", className)}
    >
      {Object.entries(hidden).map(
        ([name, value]) =>
          value && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <label htmlFor={inputId} className="sr-only">
        {label}
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
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            "w-full rounded-xl border bg-card pr-3 text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:outline-none",
            franja
              ? "border-transparent shadow-[0_2px_8px_rgb(34_45_53/0.25)] focus-visible:ring-4 focus-visible:ring-slate/60"
              : "border-input shadow-xs focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/25",
            large ? "h-14 pl-12 text-lg" : "h-12 pl-11 text-base",
          )}
        />
      </div>
      <Button
        type="submit"
        size={large ? "lg" : "default"}
        className={cn(
          large ? "h-14 px-6" : "h-12",
          franja &&
            "bg-slate text-white hover:bg-slate-raised focus-visible:ring-white/60 active:bg-slate-raised",
        )}
      >
        Buscar
      </Button>
      {autoFocusOnDesktop && <DesktopAutoFocus targetId={inputId} />}
    </form>
  );
}
