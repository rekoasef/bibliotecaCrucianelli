"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { Nivel } from "@/lib/validation/taxonomia";
import { saveMaquina } from "../../actions";

type Opcion = { id: string; label: string };

type Props = {
  nivel: Nivel;
  item?: {
    id: string;
    nombre: string;
    slug: string;
    descripcion?: string | null;
    parentId?: string;
  };
  parentOptions?: Opcion[];
  defaultParentId?: string;
};

const PARENT: Partial<Record<Nivel, { field: string; label: string }>> = {
  lineas: { field: "segmentoId", label: "Segmento" },
  modelos: { field: "lineaId", label: "Línea" },
};

const SLUG_HINT: Record<Nivel, string> = {
  segmentos: "Para la URL. Si lo dejás vacío se genera del nombre.",
  lineas:
    "Para la URL (/maquinas/gringa). Si lo dejás vacío se genera del nombre.",
  modelos:
    "Para la URL (/maquinas/gringa/gringa-v). Si lo dejás vacío se genera del nombre.",
};

export function MaquinaForm({
  nivel,
  item,
  parentOptions,
  defaultParentId,
}: Props) {
  const [state, action] = useActionState(saveMaquina, initialFormState);
  const parent = PARENT[nivel];
  const v = (key: string, fallback?: string | null) =>
    state.values?.[key] ?? fallback ?? "";

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <input type="hidden" name="nivel" value={nivel} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <Field id="nombre" label="Nombre" errors={state.fieldErrors?.nombre}>
        {(props) => (
          <Input
            {...props}
            name="nombre"
            defaultValue={v("nombre", item?.nombre)}
            required
          />
        )}
      </Field>

      {parent && parentOptions && (
        <Field
          id={parent.field}
          label={parent.label}
          errors={state.fieldErrors?.[parent.field]}
        >
          {(props) => (
            <NativeSelect
              {...props}
              name={parent.field}
              defaultValue={v(parent.field, item?.parentId ?? defaultParentId)}
              required
            >
              <option value="" disabled>
                Elegí…
              </option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}

      {nivel !== "segmentos" && (
        <Field
          id="descripcion"
          label="Descripción (opcional)"
          hint={
            nivel === "modelos"
              ? "Por ejemplo, años de fabricación o variantes."
              : undefined
          }
          errors={state.fieldErrors?.descripcion}
        >
          {(props) => (
            <textarea
              {...props}
              name="descripcion"
              rows={3}
              defaultValue={v("descripcion", item?.descripcion)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          )}
        </Field>
      )}

      <Field
        id="slug"
        label="Slug"
        hint={SLUG_HINT[nivel]}
        errors={state.fieldErrors?.slug}
      >
        {(props) => (
          <Input
            {...props}
            name="slug"
            defaultValue={v("slug", item?.slug)}
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>

      <SubmitButton className="self-start" pendingLabel="Guardando…">
        {item ? "Guardar cambios" : "Crear"}
      </SubmitButton>
    </form>
  );
}
