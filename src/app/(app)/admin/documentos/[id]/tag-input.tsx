"use client";

import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { normalizeTag } from "@/lib/text";

/**
 * Etiquetas como chips, con autocompletado sobre las existentes y creación al vuelo
 * (docs/05). Se envían como texto separado por comas en un input oculto.
 */
export function TagInput({
  id,
  name,
  defaultValue,
  existentes,
  describedBy,
}: {
  id: string;
  name: string;
  defaultValue: string[];
  existentes: string[];
  describedBy?: string;
}) {
  const [tags, setTags] = useState(defaultValue);
  const [texto, setTexto] = useState("");
  const listId = useId();

  const elegidas = useMemo(() => new Set(tags.map(normalizeTag)), [tags]);
  const q = normalizeTag(texto);
  const sugerencias = q
    ? existentes
        .filter(
          (e) => normalizeTag(e).includes(q) && !elegidas.has(normalizeTag(e)),
        )
        .slice(0, 8)
    : [];

  function agregar(valor: string) {
    const limpio = valor.trim().replace(/\s+/g, " ");
    if (limpio && !elegidas.has(normalizeTag(limpio))) {
      // Si existe una equivalente, usar su forma ("Dosificador" en vez de "dosificador").
      const existente = existentes.find(
        (e) => normalizeTag(e) === normalizeTag(limpio),
      );
      setTags((t) => [...t, existente ?? limpio]);
    }
    setTexto("");
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={tags.join(", ")} />
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Etiquetas elegidas">
          {tags.map((t) => (
            <li
              key={t}
              className="flex h-9 items-center gap-1 rounded-full border bg-secondary pr-1 pl-3 font-medium"
            >
              {t}
              <button
                type="button"
                onClick={() => setTags((all) => all.filter((x) => x !== t))}
                aria-label={`Quitar etiqueta ${t}`}
                className="flex size-8 items-center justify-center rounded-full hover:bg-background"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={texto}
        onChange={(e) => {
          const v = e.target.value;
          // Coma = agregar
          if (v.includes(",")) {
            v.split(",").slice(0, -1).forEach(agregar);
            setTexto(v.split(",").at(-1) ?? "");
          } else {
            setTexto(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            agregar(texto);
          }
        }}
        onBlur={() => texto && agregar(texto)}
        list={listId}
        autoComplete="off"
        enterKeyHint="enter"
        aria-describedby={describedBy}
        placeholder="Escribí y apretá Enter"
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <datalist id={listId}>
        {sugerencias.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
