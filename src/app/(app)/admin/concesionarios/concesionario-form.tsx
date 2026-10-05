"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { Concesionario } from "@/db/schema";
import { saveConcesionario } from "../actions";

export function ConcesionarioForm({
  concesionario,
}: {
  concesionario?: Concesionario;
}) {
  const [state, action] = useActionState(saveConcesionario, initialFormState);
  const value = (key: "nombre" | "localidad" | "provincia") =>
    state.values?.[key] ?? concesionario?.[key];

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      {concesionario && (
        <input type="hidden" name="id" value={concesionario.id} />
      )}
      <Field id="nombre" label="Nombre" errors={state.fieldErrors?.nombre}>
        {(props) => (
          <Input
            {...props}
            name="nombre"
            defaultValue={value("nombre")}
            required
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="localidad"
          label="Localidad"
          errors={state.fieldErrors?.localidad}
        >
          {(props) => (
            <Input
              {...props}
              name="localidad"
              defaultValue={value("localidad")}
              required
            />
          )}
        </Field>
        <Field
          id="provincia"
          label="Provincia"
          errors={state.fieldErrors?.provincia}
        >
          {(props) => (
            <Input
              {...props}
              name="provincia"
              defaultValue={value("provincia")}
              required
            />
          )}
        </Field>
      </div>
      <SubmitButton className="self-start" pendingLabel="Guardando…">
        {concesionario ? "Guardar cambios" : "Crear concesionario"}
      </SubmitButton>
    </form>
  );
}
