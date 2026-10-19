/**
 * Foco automático en el buscador, solo en escritorio.
 *
 * @module
 */

"use client";

import { useEffect } from "react";

/**
 * Pone el foco en el buscador solo en escritorio (pantalla ancha y puntero
 * fino): en celular abriría el teclado y taparía media pantalla apenas carga la
 * página. No renderiza nada.
 *
 * @param props - `targetId`: ID del input.
 */
export function DesktopAutoFocus({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
      document.getElementById(targetId)?.focus();
    }
  }, [targetId]);

  return null;
}
