"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { changePassword, updateNombre } from "./actions";

export function NombreForm({ nombre }: { nombre: string }) {
  const [state, action] = useActionState(updateNombre, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field id="nombre" label="Nombre" errors={state.fieldErrors?.nombre}>
        {(props) => (
          <Input
            {...props}
            name="nombre"
            autoComplete="name"
            defaultValue={nombre}
            required
          />
        )}
      </Field>
      <SubmitButton
        variant="outline"
        className="self-start"
        pendingLabel="Guardando…"
      >
        Guardar nombre
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field
        id="actual"
        label="Contraseña actual"
        errors={state.fieldErrors?.actual}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="actual"
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <Field
        id="nueva"
        label="Nueva contraseña"
        hint="Al menos 8 caracteres."
        errors={state.fieldErrors?.nueva}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="nueva"
            autoComplete="new-password"
            minLength={8}
            required
          />
        )}
      </Field>
      <Field
        id="confirmacion"
        label="Repetí la nueva contraseña"
        errors={state.fieldErrors?.confirmacion}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="confirmacion"
            autoComplete="new-password"
            required
          />
        )}
      </Field>
      <SubmitButton
        variant="outline"
        className="self-start"
        pendingLabel="Cambiando…"
      >
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
