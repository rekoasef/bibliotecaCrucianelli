import { Search } from "lucide-react";
import { FormMessage } from "@/components/forms/form-message";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countEtiquetas,
  listCatalogo,
  listEtiquetas,
} from "@/db/queries/taxonomia";
import { cn } from "@/lib/utils";
import type { Catalogo } from "@/lib/validation/taxonomia";
import { ExpandableRow } from "../expandable-row";
import { MoveButtons } from "../move-buttons";
import { InactivoBadge, PageHeader, Panel } from "../ui";
import { deleteEtiqueta, moveCatalogo, setCatalogoActivo } from "./actions";
import { CatalogoForm, EtiquetaForm, MergeEtiquetaForm } from "./forms";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Taxonomía" };

const TABS = [
  {
    id: "tipos",
    label: "Tipos",
    ayuda: "Uno por documento, obligatorio para publicar.",
  },
  {
    id: "sistemas",
    label: "Sistemas",
    ayuda: "Cero, uno o varios por documento.",
  },
  { id: "temas", label: "Temas", ayuda: "Cero, uno o varios por documento." },
  {
    id: "etiquetas",
    label: "Etiquetas",
    ayuda: "Texto libre; se normalizan para evitar duplicados.",
  },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default async function TaxonomiaPage({
  searchParams,
}: PageProps<"/admin/taxonomia">) {
  // Además del layout: layout y página se renderizan en paralelo (defensa en profundidad).
  await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab)
    ? (sp.tab as Tab)
    : "tipos";
  const q = typeof sp.q === "string" ? sp.q : "";
  const current = TABS.find((t) => t.id === tab)!;
  // Avisos después de acciones que hacen desaparecer la fila (texto fijo + nombre).
  const aviso =
    typeof sp.fusionada === "string"
      ? `Fusionada en "${sp.fusionada}".`
      : typeof sp.eliminada === "string"
        ? `Etiqueta "${sp.eliminada}" eliminada.`
        : null;

  return (
    <>
      <PageHeader title="Taxonomía" description={current.ayuda} />
      {aviso && (
        <div className="mb-5">
          <FormMessage state={{ success: aviso }} />
        </div>
      )}
      <nav aria-label="Listas" className="-mx-4 mb-5 overflow-x-auto px-4">
        <ul className="flex gap-1 border-b">
          {TABS.map((t) => (
            <li key={t.id} className="shrink-0">
              <Link
                href={`/admin/taxonomia?tab=${t.id}`}
                aria-current={t.id === tab ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center border-b-2 border-transparent px-3 font-medium text-muted-foreground hover:text-foreground",
                  t.id === tab && "border-brand text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "etiquetas" ? (
        <EtiquetasTab q={q} />
      ) : (
        <CatalogoTab kind={tab} />
      )}
    </>
  );
}

async function CatalogoTab({ kind }: { kind: Catalogo }) {
  const items = await listCatalogo(kind);

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Agregar">
        <CatalogoForm kind={kind} />
      </Panel>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {items.map((item, i) => (
          <li key={item.id} className="p-2">
            <ExpandableRow
              label={item.nombre}
              row={
                <>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 px-3 py-2">
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {item.slug}
                    </span>
                    {!item.activo && <InactivoBadge />}
                  </div>
                  <MoveButtons
                    action={moveCatalogo}
                    fields={{ kind, id: item.id }}
                    label={item.nombre}
                    isFirst={i === 0}
                    isLast={i === items.length - 1}
                  />
                </>
              }
            >
              <CatalogoForm kind={kind} item={item} />
              <form action={setCatalogoActivo} className="border-t pt-4">
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="id" value={item.id} />
                <input
                  type="hidden"
                  name="activo"
                  value={String(!item.activo)}
                />
                <p className="mb-3 text-muted-foreground">
                  {item.activo
                    ? "Inactivo = no se ofrece al cargar documentos; los existentes lo conservan."
                    : "Vuelve a ofrecerse al cargar documentos."}
                </p>
                <Button
                  type="submit"
                  variant={item.activo ? "destructive" : "outline"}
                >
                  {item.activo ? "Desactivar" : "Reactivar"}
                </Button>
              </form>
            </ExpandableRow>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function EtiquetasTab({ q }: { q: string }) {
  const [items, total] = await Promise.all([
    listEtiquetas(q),
    countEtiquetas(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Agregar">
        <EtiquetaForm />
      </Panel>

      <form className="flex gap-2" role="search">
        <input type="hidden" name="tab" value="etiquetas" />
        <label htmlFor="q-etiquetas" className="sr-only">
          Buscar etiquetas
        </label>
        <Input
          id="q-etiquetas"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar etiqueta"
        />
        <Button type="submit" variant="secondary" aria-label="Buscar">
          <Search aria-hidden className="size-5" />
        </Button>
      </form>
      <p className="-mt-2 text-sm text-muted-foreground">
        {q ? `${items.length} de ${total} etiquetas` : `${total} etiquetas`}
      </p>

      {/* Autocompletado nativo para "Fusionar en…" */}
      <datalist id="etiquetas-existentes">
        {items.map((e) => (
          <option key={e.id} value={e.nombre} />
        ))}
      </datalist>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-5 text-muted-foreground">
          {q
            ? "No hay etiquetas que coincidan."
            : "Todavía no hay etiquetas. También se crean al cargar documentos."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {items.map((e) => (
            <li key={e.id} className="p-2">
              <ExpandableRow
                label={e.nombre}
                row={
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 px-3 py-2">
                    <span className="font-semibold">{e.nombre}</span>
                    <span className="text-sm text-muted-foreground">
                      {e.usos === 1 ? "1 documento" : `${e.usos} documentos`}
                    </span>
                  </span>
                }
              >
                <EtiquetaForm item={e} />
                <div className="border-t pt-4">
                  <MergeEtiquetaForm item={e} />
                </div>
                <form action={deleteEtiqueta} className="border-t pt-4">
                  <input type="hidden" name="id" value={e.id} />
                  {e.usos > 0 && (
                    <p className="mb-3 text-muted-foreground">
                      La usan {e.usos} documentos: al eliminarla se quita de
                      todos.
                    </p>
                  )}
                  <Button type="submit" variant="destructive">
                    Eliminar etiqueta
                  </Button>
                </form>
              </ExpandableRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
