"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { initialFormState } from "@/components/forms/form-state";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import type { EstadoDoc } from "@/db/schema";
import { cn } from "@/lib/utils";
import { saveDocumento } from "../actions";
import { MaquinasPicker } from "./maquinas-picker";
import { TagInput } from "./tag-input";

type Opcion = { id: string; nombre: string; activo: boolean };

export type DocumentoFormProps = {
  doc: {
    id: string;
    titulo: string | null;
    descripcion: string | null;
    tipoId: string | null;
    version: string | null;
    fechaDocumento: string | null;
    visibleConcesionarios: boolean;
    visibleClientes: boolean;
    estado: EstadoDoc;
    lineaIds: string[];
    modeloIds: string[];
    sistemaIds: string[];
    temaIds: string[];
    productoIds: string[];
    tecnologiaIds: string[];
    etiquetas: string[];
  };
  tipos: Opcion[];
  sistemas: Opcion[];
  temas: Opcion[];
  productos: Opcion[];
  tecnologias: Opcion[];
  segmentos: React.ComponentProps<typeof MaquinasPicker>["segmentos"];
  etiquetasExistentes: string[];
  haySiguienteBorrador: boolean;
};

const textareaClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function DocumentoForm({
  doc,
  tipos,
  sistemas,
  temas,
  productos,
  tecnologias,
  segmentos,
  etiquetasExistentes,
  haySiguienteBorrador,
}: DocumentoFormProps) {
  const [state, action] = useActionState(saveDocumento, initialFormState);
  const esBorrador = doc.estado === "borrador";
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={doc.id} />

      <Section title="Datos">
        <Field id="titulo" label="Título" errors={fe.titulo}>
          {(p) => (
            <Input {...p} name="titulo" defaultValue={doc.titulo ?? ""} />
          )}
        </Field>
        <Field id="tipoId" label="Tipo de documento" errors={fe.tipoId}>
          {(p) => (
            <NativeSelect {...p} name="tipoId" defaultValue={doc.tipoId ?? ""}>
              <option value="">Sin elegir</option>
              {tipos
                .filter((t) => t.activo || t.id === doc.tipoId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
            </NativeSelect>
          )}
        </Field>
        <Field
          id="descripcion"
          label="Descripción (opcional)"
          errors={fe.descripcion}
        >
          {(p) => (
            <textarea
              {...p}
              name="descripcion"
              rows={3}
              defaultValue={doc.descripcion ?? ""}
              className={textareaClass}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="version"
            label="Versión (opcional)"
            hint='Ej.: "Rev. 3", "2025".'
            errors={fe.version}
          >
            {(p) => (
              <Input {...p} name="version" defaultValue={doc.version ?? ""} />
            )}
          </Field>
          <Field
            id="fechaDocumento"
            label="Fecha del documento (opcional)"
            errors={fe.fechaDocumento}
          >
            {(p) => (
              <Input
                {...p}
                name="fechaDocumento"
                type="date"
                defaultValue={doc.fechaDocumento ?? ""}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Visibilidad"
        help="Fábrica ve todo. Marcá quién más puede verlo; sin ninguna casilla queda Solo fábrica (planos y documentación sensible)."
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Quién más lo ve</legend>
          {(
            [
              [
                "concesionarios",
                "Concesionarios",
                "Mecánicos de los concesionarios, con su cuenta.",
                doc.visibleConcesionarios,
              ],
              [
                "clientes",
                "Clientes",
                "Clientes finales: acceso libre, sin cuenta.",
                doc.visibleClientes,
              ],
            ] as const
          ).map(([value, label, help, checked]) => (
            <label
              key={value}
              className="flex cursor-pointer gap-3 rounded-lg border p-4 has-checked:border-brand has-checked:bg-brand/5"
            >
              <input
                type="checkbox"
                name="publicos"
                value={value}
                defaultChecked={checked}
                className="mt-0.5 size-5 accent-brand"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{label}</span>
                <span className="text-sm text-muted-foreground">{help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Section>

      <Section
        title="Producto"
        help="Sembradoras, Fertilizadoras, Tecnología… Para publicar hace falta al menos una máquina o un producto."
      >
        <CheckboxGroup
          legend="Producto"
          name="productos"
          opciones={productos}
          elegidos={doc.productoIds}
        />
        <CheckboxGroup
          legend="Tecnología (para documentos de Tecnología)"
          name="tecnologias"
          opciones={tecnologias}
          elegidos={doc.tecnologiaIds}
        />
      </Section>

      <Section
        title="Máquinas"
        help="Marcá la línea completa si aplica a todos sus modelos. Puede quedar vacío si no corresponde a una máquina (por ejemplo, un monitor)."
      >
        <MaquinasPicker
          segmentos={segmentos}
          defaultLineas={doc.lineaIds}
          defaultModelos={doc.modeloIds}
        />
      </Section>

      <Section
        title="Sistemas y temas"
        help="Opcionales. Lo normal es uno de cada uno."
      >
        <CheckboxGroup
          legend="Sistemas"
          name="sistemas"
          opciones={sistemas}
          elegidos={doc.sistemaIds}
        />
        <CheckboxGroup
          legend="Temas"
          name="temas"
          opciones={temas}
          elegidos={doc.temaIds}
        />
      </Section>

      <Section
        title="Etiquetas"
        help="Términos técnicos que ayudan a encontrarlo: dosificador, sensor, cardán…"
      >
        <TagInput
          id="etiquetas"
          name="etiquetas"
          defaultValue={doc.etiquetas}
          existentes={etiquetasExistentes}
        />
      </Section>

      <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-10 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-md md:bottom-4">
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-2">
          {esBorrador ? (
            <>
              <SubmitButton
                name="intent"
                value="publicar"
                pendingLabel="Guardando…"
              >
                Publicar
              </SubmitButton>
              <SubmitButton
                name="intent"
                value="guardar"
                variant="outline"
                pendingLabel="Guardando…"
              >
                Guardar borrador
              </SubmitButton>
              {haySiguienteBorrador && (
                <SubmitButton
                  name="intent"
                  value="siguiente"
                  variant="ghost"
                  pendingLabel="Guardando…"
                >
                  Guardar y siguiente borrador
                </SubmitButton>
              )}
            </>
          ) : (
            <SubmitButton
              name="intent"
              value="guardar"
              pendingLabel="Guardando…"
            >
              Guardar cambios
            </SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {help && <p className="text-sm text-muted-foreground">{help}</p>}
      </div>
      {children}
    </section>
  );
}

function CheckboxGroup({
  legend,
  name,
  opciones,
  elegidos,
}: {
  legend: string;
  name: string;
  opciones: Opcion[];
  elegidos: string[];
}) {
  const visibles = opciones.filter((o) => o.activo || elegidos.includes(o.id));
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {visibles.map((o) => (
          <label
            key={o.id}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-accent",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={o.id}
              defaultChecked={elegidos.includes(o.id)}
              className="size-5 accent-brand"
            />
            {o.nombre}
            {!o.activo && (
              <span className="text-sm text-muted-foreground">(inactivo)</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
