// Datos iniciales según docs/04-taxonomia.md. Son un punto de partida: después se
// administran desde el panel. Los marcados "a confirmar" en el doc se cargan igual.

export const SEED_MAQUINAS = [
  {
    segmento: "Granos gruesos",
    activo: true,
    lineas: [
      { nombre: "Gringa", modelos: ["Gringa V", "Gringa Nueva"] },
      { nombre: "Plantor", modelos: [] },
      { nombre: "Domina", modelos: [] },
    ],
  },
  {
    segmento: "Granos finos",
    activo: true,
    lineas: [
      { nombre: "Pionera", modelos: [] },
      { nombre: "Drilor", modelos: [] },
      { nombre: "Mixia", modelos: [] }, // a confirmar: ¿línea propia o modelo de Drilor?
    ],
  },
  {
    segmento: "Fertilización",
    activo: false, // fase posterior
    lineas: [
      { nombre: "Fertec", modelos: [] },
      { nombre: "Raster", modelos: [] },
    ],
  },
];

export const SEED_TIPOS = [
  "Manual",
  "Instructivo",
  "Procedimiento",
  "Video",
  "Plano",
  "Despiece",
  "Ficha técnica",
  "Boletín técnico",
  "Solución de problemas",
];

export const SEED_SISTEMAS = [
  "Dosificación",
  "Hidráulica",
  "Eléctrica",
  "Electrónica",
  "Mantenimiento",
  "Chasis y estructura",
  "Tren de siembra",
];

export const SEED_PRODUCTOS = [
  "Sembradoras",
  "Fertilizadoras",
  "Tecnología",
  "Accesorios siembra",
];

export const SEED_TEMAS = [
  "Regulación",
  "Calibración",
  "Diagnóstico",
  "Instalación",
  "Reparación",
  "Puesta en marcha",
];
