"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { resendInvitation } from "../../actions";

export function ResendInvitation({ id }: { id: string }) {
  const [state, action] = useActionState(resendInvitation, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        variant="outline"
        className="self-start"
        pendingLabel="Enviando…"
      >
        Reenviar invitación
      </SubmitButton>
    </form>
  );
}
