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

const ICONS = {
  pdf: FileText,
  video: FileVideo,
  imagen: FileImage,
  documento: FileType,
  otro: File,
};

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

const LABELS = {
  pdf: "PDF",
  video: "Video",
  imagen: "Imagen",
  documento: "Documento",
  otro: "Archivo",
};

export function fileKindLabel(mimeType: string) {
  return LABELS[fileKind(mimeType)];
}
