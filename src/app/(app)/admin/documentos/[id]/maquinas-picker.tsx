"use client";

import { useState } from "react";

type Linea = {
  id: string;
  nombre: string;
  activo: boolean;
  modelos: { id: string; nombre: string; activo: boolean }[];
};

/**
 * Máquinas en dos niveles (docs/03): marcar la línea completa cubre todos sus
 * modelos, presentes y futuros; si no, se marcan modelos puntuales.
 */
export function MaquinasPicker({
  segmentos,
  defaultLineas,
  defaultModelos,
}: {
  segmentos: { id: string; nombre: string; activo: boolean; lineas: Linea[] }[];
  defaultLineas: string[];
  defaultModelos: string[];
}) {
  const [lineas, setLineas] = useState(() => new Set(defaultLineas));
  const [modelos, setModelos] = useState(() => new Set(defaultModelos));

  function toggle(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    id: string,
    on: boolean,
  ) {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    setter(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {segmentos.map((s) => {
        // No ofrecer máquinas inactivas, salvo las que ya están elegidas.
        const visibles = s.lineas.filter(
          (l) =>
            (s.activo && l.activo) ||
            lineas.has(l.id) ||
            l.modelos.some((m) => modelos.has(m.id)),
        );
        if (visibles.length === 0) return null;
        return (
          <fieldset key={s.id} className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {s.nombre}
              {!s.activo && " · inactivo"}
            </legend>
            <ul className="flex flex-col">
              {visibles.map((l) => {
                const completa = lineas.has(l.id);
                return (
                  <li key={l.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-accent">
                      <input
                        type="checkbox"
                        name="lineas"
                        value={l.id}
                        checked={completa}
                        onChange={(e) =>
                          toggle(lineas, setLineas, l.id, e.target.checked)
                        }
                        className="size-5 accent-brand"
                      />
                      <span className="font-semibold">{l.nombre}</span>
                      <span className="text-sm text-muted-foreground">
                        línea completa
                        {(!l.activo || !s.activo) && " · inactiva"}
                      </span>
                    </label>
                    {l.modelos.length > 0 && (
                      <ul className="ml-8 flex flex-col border-l pl-3">
                        {l.modelos
                          .filter((m) => m.activo || modelos.has(m.id))
                          .map((m) => (
                            <li key={m.id}>
                              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-accent has-disabled:cursor-default has-disabled:text-muted-foreground">
                                <input
                                  type="checkbox"
                                  name={completa ? undefined : "modelos"}
                                  value={m.id}
                                  checked={completa || modelos.has(m.id)}
                                  disabled={completa}
                                  onChange={(e) =>
                                    toggle(
                                      modelos,
                                      setModelos,
                                      m.id,
                                      e.target.checked,
                                    )
                                  }
                                  className="size-5 accent-brand"
                                />
                                {m.nombre}
                                {completa && (
                                  <span className="text-sm">
                                    (incluido en la línea)
                                  </span>
                                )}
                                {!m.activo && (
                                  <span className="text-sm text-muted-foreground">
                                    · inactivo
                                  </span>
                                )}
                              </label>
                            </li>
                          ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
