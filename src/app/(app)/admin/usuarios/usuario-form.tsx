"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { RolUsuario } from "@/db/schema";
import { ROL_LABEL } from "@/lib/labels";
import { createUsuario, updateUsuario } from "../actions";

type Props = {
  concesionarios: { id: string; nombre: string; activo: boolean }[];
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol: RolUsuario;
    concesionarioId: string | null;
  };
  defaultConcesionarioId?: string;
};

export function UsuarioForm({
  concesionarios,
  usuario,
  defaultConcesionarioId,
}: Props) {
  const [state, action] = useActionState(
    usuario ? updateUsuario : createUsuario,
    initialFormState,
  );
  const initialRol =
    (state.values?.rol as RolUsuario | undefined) ??
    usuario?.rol ??
    (defaultConcesionarioId ? "concesionario" : "");
  const [rol, setRol] = useState<string>(initialRol);

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <Field
        id="nombre"
        label="Nombre y apellido"
        errors={state.fieldErrors?.nombre}
      >
        {(props) => (
          <Input
            {...props}
            name="nombre"
            defaultValue={state.values?.nombre ?? usuario?.nombre}
            required
          />
        )}
      </Field>
      <Field
        id="email"
        label="Email"
        hint={
          usuario
            ? undefined
            : "Le llega la invitación para definir su contraseña."
        }
        errors={state.fieldErrors?.email}
      >
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.email ?? usuario?.email}
            required
          />
        )}
      </Field>
      <Field id="rol" label="Rol" errors={state.fieldErrors?.rol}>
        {(props) => (
          <NativeSelect
            {...props}
            name="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            required
          >
            <option value="" disabled>
              Elegí un rol
            </option>
            {(Object.keys(ROL_LABEL) as RolUsuario[]).map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      {rol === "concesionario" && (
        <Field
          id="concesionarioId"
          label="Concesionario"
          errors={state.fieldErrors?.concesionarioId}
        >
          {(props) => (
            <NativeSelect
              {...props}
              name="concesionarioId"
              defaultValue={
                state.values?.concesionarioId ??
                usuario?.concesionarioId ??
                defaultConcesionarioId ??
                ""
              }
              required
            >
              <option value="" disabled>
                Elegí un concesionario
              </option>
              {concesionarios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {!c.activo && " (inactivo)"}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      <SubmitButton className="self-start" pendingLabel="Guardando…">
        {usuario ? "Guardar cambios" : "Crear y enviar invitación"}
      </SubmitButton>
    </form>
  );
}
