/**
 * Ícono y nombre del formato de un archivo.
 *
 * @module
 */

import {
  File,
  FileImage,
  FileText,
  FileType,
  FileVideo,
  Folder,
} from "lucide-react";
import { fileKind } from "@/lib/drive/mime";
import { cn } from "@/lib/utils";

/** Ícono por categoría de archivo. */
const ICONS = {
  pdf: FileText,
  video: FileVideo,
  imagen: FileImage,
  documento: FileType,
  otro: File,
};

/**
 * Ícono del archivo según su tipo (o de carpeta). Decorativo (`aria-hidden`).
 *
 * @param props - `mimeType`, `folder` (muestra una carpeta) y `className`.
 */
export function FileIcon({
  mimeType,
  folder = false,
  className,
}: {
  mimeType: string;
  folder?: boolean;
  className?: string;
}) {
  const Icon = folder ? Folder : ICONS[fileKind(mimeType)];
  return <Icon aria-hidden className={cn("size-6 shrink-0", className)} />;
}

/** Nombre del formato por categoría de archivo. */
const LABELS = {
  pdf: "PDF",
  video: "Video",
  imagen: "Imagen",
  documento: "Documento",
  otro: "Archivo",
};

/**
 * Nombre del formato para mostrar ("PDF", "Video"…).
 *
 * @param mimeType - Tipo del archivo.
 */
export function fileKindLabel(mimeType: string) {
  return LABELS[fileKind(mimeType)];
}
