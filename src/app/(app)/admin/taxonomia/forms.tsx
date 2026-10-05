"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { Catalogo } from "@/lib/validation/taxonomia";
import { mergeEtiqueta, saveCatalogo, saveEtiqueta } from "./actions";

type Item = { id: string; nombre: string; slug?: string };

export function CatalogoForm({ kind, item }: { kind: Catalogo; item?: Item }) {
  const [state, action] = useActionState(saveCatalogo, initialFormState);
  const prefix = item ? `edit-${item.id}` : `nuevo-${kind}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${prefix}-nombre`}
          label="Nombre"
          errors={state.fieldErrors?.nombre}
        >
          {(props) => (
            // key: limpia el campo después de agregar
            <Input
              key={item ? undefined : state.success}
              {...props}
              name="nombre"
              defaultValue={
                state.success && !item
                  ? ""
                  : (state.values?.nombre ?? item?.nombre)
              }
              required
            />
          )}
        </Field>
        <Field
          id={`${prefix}-slug`}
          label="Slug"
          hint={item ? undefined : "Opcional: se genera del nombre."}
          errors={state.fieldErrors?.slug}
        >
          {(props) => (
            <Input
              key={item ? undefined : state.success}
              {...props}
              name="slug"
              defaultValue={
                state.success && !item ? "" : (state.values?.slug ?? item?.slug)
              }
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
            />
          )}
        </Field>
      </div>
      <SubmitButton
        className="self-start"
        variant={item ? "outline" : "default"}
        pendingLabel="Guardando…"
      >
        {item ? "Guardar" : "Agregar"}
      </SubmitButton>
    </form>
  );
}

export function EtiquetaForm({ item }: { item?: Item }) {
  const [state, action] = useActionState(saveEtiqueta, initialFormState);
  const id = item ? `etq-${item.id}-nombre` : "etq-nueva";

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field
        id={id}
        label={item ? "Nuevo nombre" : "Nueva etiqueta"}
        hint={
          item
            ? undefined
            : "Términos técnicos que no son tipo, sistema, tema ni máquina."
        }
        errors={state.fieldErrors?.nombre}
      >
        {(props) => (
          <Input
            key={item ? undefined : state.success}
            {...props}
            name="nombre"
            defaultValue={
              state.success && !item
                ? ""
                : (state.values?.nombre ?? item?.nombre)
            }
            required
          />
        )}
      </Field>
      <SubmitButton
        className="self-start"
        variant={item ? "outline" : "default"}
        pendingLabel="Guardando…"
      >
        {item ? "Renombrar" : "Agregar"}
      </SubmitButton>
    </form>
  );
}

export function MergeEtiquetaForm({ item }: { item: Item }) {
  const [state, action] = useActionState(mergeEtiqueta, initialFormState);
  const id = `merge-${item.id}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={item.id} />
      <Field
        id={id}
        label={`Fusionar "${item.nombre}" en…`}
        hint="Los documentos con esta etiqueta pasan a la de destino y esta se elimina."
        errors={state.fieldErrors?.destino}
      >
        {(props) => (
          <Input
            {...props}
            name="destino"
            list="etiquetas-existentes"
            autoComplete="off"
            required
          />
        )}
      </Field>
      <SubmitButton
        className="self-start"
        variant="outline"
        pendingLabel="Fusionando…"
      >
        Fusionar
      </SubmitButton>
    </form>
  );
}
