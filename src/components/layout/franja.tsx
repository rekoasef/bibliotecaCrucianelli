import { cn } from "@/lib/utils";

/**
 * Franja roja Crucianelli: la cabecera de cada página, con el doble trazo de
 * fondo, como la pintura de la máquina. Una sola por pantalla y siempre de
 * borde a borde; el contenido queda alineado con el resto de la página.
 * Tiene que ser hija directa del contenedor de la página (ancho de `main`).
 */
export function Franja({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="mx-[calc(50%-50vw)] -mt-6 bg-brand franja-trazos text-white md:-mt-10">
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 pt-6 pb-7 md:px-6 md:pt-10 md:pb-10",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
