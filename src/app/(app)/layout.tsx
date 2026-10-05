import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-card px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      {/* En celular se reserva el alto de la navegación inferior para que no tape contenido. */}
      <main
        id="contenido"
        className="mx-auto w-full max-w-6xl px-4 pt-6 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+2rem)] md:px-6 md:pt-10 md:pb-16"
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
