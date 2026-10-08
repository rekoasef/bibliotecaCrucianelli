import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Montserrat } from "next/font/google";
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

// Montserrat (la del sitio de Crucianelli), en peso alto para títulos y nombres
// de máquina, como las calcos. El texto corrido sigue en Atkinson.
const fontDisplay = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
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
  // Barra del navegador del celular del color de la barra superior (pizarra).
  themeColor: "#222d35",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${fontSans.variable} ${fontDisplay.variable} antialiased`}
    >
      <body className="min-h-dvh overflow-x-clip">{children}</body>
    </html>
  );
}
