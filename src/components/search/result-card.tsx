import Link from "next/link";
import { TipoIcon } from "@/components/tipo-icon";
import { fileKind } from "@/lib/drive/mime";
import type { SearchResult } from "@/lib/search/search";
import { Highlight } from "./highlight";

const FORMATO: Record<string, string> = {
  pdf: "PDF",
  video: "Video",
  imagen: "Imagen",
  documento: "Documento",
  otro: "Archivo",
};

export function ResultCard({
  result: r,
  compact = false,
}: {
  result: SearchResult;
  compact?: boolean;
}) {
  const formatos = [...new Set(r.mimeTypes.map((m) => FORMATO[fileKind(m)]))];

  return (
    <Link
      href={`/documentos/${r.id}`}
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:bg-accent"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-brand-strong">
        {r.tipoSlug && <TipoIcon slug={r.tipoSlug} className="size-4" />}
        {r.tipoNombre ?? "Sin tipo"}
        {r.estado !== "vigente" && (
          <span className="rounded-full border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {r.estado === "obsoleto" ? "Obsoleto" : "Borrador"}
          </span>
        )}
      </span>
      <span className="text-lg leading-snug font-semibold text-foreground">
        {r.titulo || "Sin título"}
      </span>
      {!compact && r.snippet && (
        <span className="line-clamp-3 text-muted-foreground">
          <Highlight text={r.snippet} />
        </span>
      )}
      <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        {r.maquinas && <span>{r.maquinas}</span>}
        {formatos.length > 0 && <span>{formatos.join(" · ")}</span>}
      </span>
    </Link>
  );
}
