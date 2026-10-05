"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { registrarVideo } from "./actions";

/**
 * Video con link público de Drive. El reproductor se carga recién al tocar
 * "Reproducir" (ahorra datos con mala señal) y siempre está "Abrir en Drive"
 * porque el embebido a veces falla en celulares (docs/02).
 */
export function VideoPlayer({
  archivoId,
  driveFileId,
  nombre,
}: {
  archivoId: string;
  driveFileId: string;
  nombre: string;
}) {
  const [playing, setPlaying] = useState(false);
  const base = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-foreground">
        {playing ? (
          <iframe
            src={`${base}/preview`}
            title={nombre}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              void registrarVideo(archivoId);
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-brand">
              <Play aria-hidden className="size-8 fill-current" />
            </span>
            <span className="font-semibold">Reproducir video</span>
          </button>
        )}
      </div>
      <Button asChild variant="outline" className="self-start">
        <a href={`${base}/view`} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden className="size-5" />
          Abrir en Drive
        </a>
      </Button>
    </div>
  );
}
