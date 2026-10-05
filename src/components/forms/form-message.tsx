import { CircleAlert, CircleCheck } from "lucide-react";
import type { FormState } from "./form-state";

/** Mensaje general del formulario (error o éxito), anunciado a lectores de pantalla. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
      >
        <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="font-medium">{state.error}</p>
      </div>
    );
  }
  if (state.success) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-lg border border-emerald-700/30 bg-emerald-50 p-3 text-emerald-900"
      >
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="font-medium">{state.success}</p>
      </div>
    );
  }
  return null;
}
