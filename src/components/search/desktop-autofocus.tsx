"use client";

import { useEffect } from "react";

// Foco directo en el buscador solo en escritorio: en celular abriría el teclado
// y taparía media pantalla apenas carga la página.
export function DesktopAutoFocus({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
      document.getElementById(targetId)?.focus();
    }
  }, [targetId]);

  return null;
}
