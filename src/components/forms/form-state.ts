export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};
