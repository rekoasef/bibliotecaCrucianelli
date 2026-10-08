import Link from "next/link";

// Logo oficial (blanco, del sitio de Crucianelli) para fondos pizarra o rojos.
// PNG provisorio hasta tener el SVG: public/brand/crucianelli-blanco.png (300×69).
export function BrandMark() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG chico y estático; next/image no aporta */}
      <img
        src="/brand/crucianelli-blanco.png"
        alt="Crucianelli"
        width={300}
        height={69}
        className="h-6 w-auto md:h-7"
      />
      <span className="border-l border-white/25 pl-3 text-xs leading-tight font-semibold tracking-wide text-on-slate-muted uppercase">
        Biblioteca
        <br />
        técnica
      </span>
    </Link>
  );
}
