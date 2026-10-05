import Link from "next/link";

// Marca provisoria en texto hasta tener el logo oficial (docs/06, "Antes de empezar").
export function BrandMark() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span aria-hidden className="h-7 w-1.5 rounded-full bg-brand" />
      <span className="flex flex-col leading-none">
        <span className="text-[1.05rem] font-bold tracking-[0.04em] uppercase">
          Crucianelli
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Biblioteca técnica
        </span>
      </span>
    </Link>
  );
}
