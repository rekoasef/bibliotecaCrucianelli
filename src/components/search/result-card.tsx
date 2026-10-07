import Link from "next/link";
import { BookOpen } from "lucide-react";
import { TipoIcon } from "@/components/tipo-icon";
import { fileKind } from "@/lib/drive/mime";
import type { PaginasArchivo, SearchResult } from "@/lib/search/search";
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
      {!compact && r.paginas && r.paginas.length > 0 && (
        <span className="flex items-start gap-1.5 text-sm font-medium text-foreground">
          <BookOpen aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span className="flex flex-col">
            {r.paginas.map((a, i) => (
              <span key={i}>
                {r.paginas!.length > 1 && (
                  <span className="text-muted-foreground">{a.nombre}: </span>
                )}
                {paginasLabel(a)}
              </span>
            ))}
          </span>
        </span>
      )}
      <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        {r.maquinas && <span>{r.maquinas}</span>}
        {formatos.length > 0 && <span>{formatos.join(" · ")}</span>}
      </span>
    </Link>
  );
}

/** "Pág. 12", "Págs. 12, 40 y 47", "Págs. 3, 5, 8, 9, 12 y 4 más". */
function paginasLabel({ paginas, mas }: PaginasArchivo) {
  if (paginas.length === 1 && !mas) return `Pág. ${paginas[0]}`;
  const lista = mas
    ? `${paginas.join(", ")} y ${mas} más`
    : `${paginas.slice(0, -1).join(", ")} y ${paginas.at(-1)}`;
  return `Págs. ${lista}`;
}
