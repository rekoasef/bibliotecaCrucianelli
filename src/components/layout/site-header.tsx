/**
 * Barra superior de la app.
 *
 * @module
 */

import { BrandMark } from "./brand-mark";
import { DesktopNav } from "./desktop-nav";
import type { NavMode } from "./nav-items";

/**
 * Barra pizarra fija con el logo blanco, como la web de Crucianelli, y la
 * navegación de escritorio.
 *
 * @param props - `mode`: qué ítems de navegación mostrar.
 */
export function SiteHeader({ mode }: { mode: NavMode }) {
  return (
    <header className="sticky top-0 z-40 bg-slate text-white">
      <div className="mx-auto flex h-(--header-height) max-w-6xl items-center justify-between px-4 md:px-6">
        <BrandMark />
        <DesktopNav mode={mode} />
      </div>
    </header>
  );
}
