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

// Ícono por slug de tipo de documento. Los tipos nuevos usan el genérico.
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

export function tipoIcon(slug: string): LucideIcon {
  return ICONOS[slug] ?? FileText;
}
