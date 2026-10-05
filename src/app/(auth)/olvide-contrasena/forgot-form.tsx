"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "../actions";

export function ForgotForm() {
  const [state, action] = useActionState(
    requestPasswordReset,
    initialFormState,
  );

  if (state.success) return <FormMessage state={state} />;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field id="email" label="Email" errors={state.fieldErrors?.email}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={state.values?.email}
          />
        )}
      </Field>
      <SubmitButton size="lg" pendingLabel="Enviando…">
        Enviar link
      </SubmitButton>
    </form>
  );
}
