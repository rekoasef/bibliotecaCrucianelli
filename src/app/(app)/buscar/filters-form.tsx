import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SearchOptions } from "@/lib/search/options";
import type { SearchFilters } from "@/lib/search/search";

/**
 * Formulario GET de filtros. Se usa en la columna de escritorio y dentro del
 * panel inferior en celular (por eso `idPrefix`: los IDs no se repiten).
 */
export function FiltersForm({
  idPrefix,
  options,
  filters,
}: {
  idPrefix: string;
  options: SearchOptions;
  filters: SearchFilters;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const maquina = filters.modelo
    ? `modelo:${filters.modelo}`
    : filters.linea
      ? `linea:${filters.linea}`
      : "";

  return (
    <form action="/buscar" className="flex flex-col gap-4">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}

      <Select
        id={id("producto")}
        name="producto"
        label="Producto"
        value={filters.producto}
        opciones={options.productos}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={id("maquina")}>Máquina</Label>
        <NativeSelect id={id("maquina")} name="maquina" defaultValue={maquina}>
          <option value="">Todas</option>
          {options.maquinas.map((s) => (
            <optgroup key={s.segmento} label={s.segmento}>
              {s.lineas.map((l) => [
                <option key={l.slug} value={`linea:${l.slug}`}>
                  {l.nombre} (todos los modelos)
                </option>,
                ...l.modelos.map((m) => (
                  <option key={m.slug} value={`modelo:${m.slug}`}>
                    {"  "}
                    {m.nombre}
                  </option>
                )),
              ])}
            </optgroup>
          ))}
        </NativeSelect>
      </div>

      <Select
        id={id("tipo")}
        name="tipo"
        label="Tipo"
        value={filters.tipo}
        opciones={options.tipos}
      />
      <Select
        id={id("sistema")}
        name="sistema"
        label="Sistema"
        value={filters.sistema}
        opciones={options.sistemas}
      />
      <Select
        id={id("tema")}
        name="tema"
        label="Tema"
        value={filters.tema}
        opciones={options.temas}
      />
      {options.etiquetas.length > 0 && (
        <Select
          id={id("etiqueta")}
          name="etiqueta"
          label="Etiqueta"
          value={filters.etiqueta}
          opciones={options.etiquetas}
        />
      )}

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          name="obsoletos"
          value="1"
          defaultChecked={filters.obsoletos}
          className="size-5 accent-brand"
        />
        Incluir obsoletos
      </label>

      <Button type="submit" size="lg">
        Aplicar filtros
      </Button>
    </form>
  );
}

function Select({
  id,
  name,
  label,
  value,
  opciones,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  opciones: { nombre: string; slug: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} defaultValue={value ?? ""}>
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.nombre}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
