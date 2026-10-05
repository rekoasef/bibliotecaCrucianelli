"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { elegirFotoLinea, incorporar } from "./actions";

/** Envoltorio del listado: las casillas de los archivos van como `children`. */
export function IncorporarForm({
  agregarA,
  children,
}: {
  agregarA?: string;
  children: React.ReactNode;
}) {
  const [state, action] = useActionState(incorporar, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {agregarA && <input type="hidden" name="agregarA" value={agregarA} />}
      {children}
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-md md:bottom-4">
        {!agregarA && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">
              Al incorporar, crear…
            </legend>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="modo"
                value="uno-por-archivo"
                defaultChecked
                className="size-5 accent-brand"
              />
              Un documento por archivo
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="modo"
                value="uno-con-todos"
                className="size-5 accent-brand"
              />
              Un documento con todos los archivos (ej.: instructivo + su video)
            </label>
          </fieldset>
        )}
        <SubmitButton className="self-start" pendingLabel="Incorporando…">
          {agregarA ? "Agregar al documento" : "Incorporar seleccionados"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function FotoLineaForm({
  lineaId,
  children,
}: {
  lineaId: string;
  children: React.ReactNode;
}) {
  const [state, action] = useActionState(elegirFotoLinea, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="fotoLinea" value={lineaId} />
      {children}
      <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] rounded-xl border bg-card p-4 shadow-md md:bottom-4">
        <SubmitButton pendingLabel="Guardando…">
          Usar como foto de la línea
        </SubmitButton>
      </div>
    </form>
  );
}
