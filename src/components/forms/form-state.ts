/**
 * Estado de los formularios que usan Server Actions con `useActionState`.
 *
 * @module
 */

/**
 * Lo que devuelve una Server Action de formulario: error general, mensaje de
 * éxito, errores por campo y los valores enviados (para no perder lo escrito).
 */
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

/** Estado inicial (vacío) para `useActionState`. */
export const initialFormState: FormState = {};

/**
 * Campos de texto de un `FormData` como objeto (descarta archivos), para
 * validarlos y devolverlos en {@link FormState.values}.
 *
 * @param formData - Datos del formulario.
 */
export function formValues(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;
}
