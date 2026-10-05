"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { incorporarDesdeLinks } from "./actions";

/** Pegar uno o varios links de Drive en vez de navegar las carpetas. */
export function LinksForm({ agregarA }: { agregarA?: string }) {
  const [state, action] = useActionState(
    incorporarDesdeLinks,
    initialFormState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {agregarA && <input type="hidden" name="agregarA" value={agregarA} />}
      <Field
        id="links"
        label="Links de Drive"
        hint="Uno por línea. En Drive: clic derecho → Compartir → Copiar vínculo. Si pegás el link de una carpeta, se abre en el explorador."
      >
        {(props) => (
          <textarea
            {...props}
            name="links"
            rows={3}
            defaultValue={state.values?.links}
            placeholder="https://drive.google.com/file/d/…"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
      </Field>
      {!agregarA && (
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Al incorporar, crear…</legend>
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
            Un documento con todos
          </label>
        </fieldset>
      )}
      <SubmitButton className="self-start" pendingLabel="Incorporando…">
        {agregarA ? "Agregar links al documento" : "Incorporar links"}
      </SubmitButton>
    </form>
  );
}
