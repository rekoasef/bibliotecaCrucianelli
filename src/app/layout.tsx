import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible: diseñada para máxima legibilidad (pantallas chicas, al sol).
// next/font la sirve desde el propio servidor, sin pedidos a Google en el celular.
const fontSans = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin"],
  // next/font no tiene métricas de esta fuente para ajustar el fallback.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Biblioteca Técnica Crucianelli",
    template: "%s · Biblioteca Técnica Crucianelli",
  },
  description:
    "Documentación técnica de sembradoras Crucianelli para concesionarios y fábrica.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${fontSans.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
