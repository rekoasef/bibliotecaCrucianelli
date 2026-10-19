/**
 * Ícono de cada tipo de documento.
 *
 * @module
 */

import { createElement } from "react";
import {
  BookOpen,
  ClipboardList,
  DraftingCompass,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Newspaper,
  PlayCircle,
  Puzzle,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícono por slug de tipo de documento (los de docs/04). Los tipos nuevos usan
 * el genérico.
 */
const ICONOS: Record<string, LucideIcon> = {
  manual: BookOpen,
  instructivo: ClipboardList,
  procedimiento: ListChecks,
  video: PlayCircle,
  plano: DraftingCompass,
  despiece: Puzzle,
  "ficha-tecnica": FileSpreadsheet,
  "boletin-tecnico": Newspaper,
  "solucion-de-problemas": Wrench,
};

/**
 * Ícono de un tipo de documento.
 *
 * @param slug - Slug del tipo.
 * @returns El ícono de Lucide, o uno genérico.
 */
export function tipoIcon(slug: string): LucideIcon {
  return ICONOS[slug] ?? FileText;
}

/**
 * Ícono del tipo de documento como componente (evita crear componentes durante
 * el render). Decorativo (`aria-hidden`).
 *
 * @param props - `slug` del tipo y `className`.
 */
export function TipoIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  return createElement(tipoIcon(slug), { "aria-hidden": true, className });
}
