"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { setPassword } from "./actions";

export function SetPasswordForm({
  token,
  submitLabel,
}: {
  token: string;
  submitLabel: string;
}) {
  const [state, action] = useActionState(setPassword, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        id="password"
        label="Nueva contraseña"
        hint="Al menos 8 caracteres."
        errors={state.fieldErrors?.password}
      >
        {(props) => (
          <PasswordInput
            {...props}
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        )}
      </Field>
      <Field
        id="confirmacion"
        label="Repetí la contraseña"
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
      <SubmitButton size="lg" pendingLabel="Guardando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
