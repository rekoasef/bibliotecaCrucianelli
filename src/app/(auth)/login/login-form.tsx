"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { login } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Email">
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
      <Field id="password" label="Contraseña">
        {(props) => (
          <PasswordInput
            {...props}
            name="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <SubmitButton size="lg" pendingLabel="Ingresando…">
        Ingresar
      </SubmitButton>
      <Link
        href="/olvide-contrasena"
        className="-my-2 flex min-h-11 items-center justify-center font-medium text-brand-strong underline-offset-4 hover:underline"
      >
        Olvidé mi contraseña
      </Link>
    </form>
  );
}
