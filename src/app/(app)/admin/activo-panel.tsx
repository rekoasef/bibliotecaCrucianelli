import { Button } from "@/components/ui/button";
import { Panel } from "./ui";

type Props = {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  activo: boolean;
  nombre: string;
  descripcionDesactivar: string;
  descripcionReactivar: string;
};

/** Panel separado para activar/desactivar (acción reversible, lejos del botón Guardar). */
export function ActivoPanel({
  action,
  fields,
  activo,
  nombre,
  descripcionDesactivar,
  descripcionReactivar,
}: Props) {
  return (
    <Panel title={activo ? "Desactivar" : "Reactivar"}>
      <p className="text-muted-foreground">
        {activo ? descripcionDesactivar : descripcionReactivar}
      </p>
      <form action={action}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="activo" value={String(!activo)} />
        <Button type="submit" variant={activo ? "destructive" : "outline"}>
          {activo ? `Desactivar ${nombre}` : `Reactivar ${nombre}`}
        </Button>
      </form>
    </Panel>
  );
}
