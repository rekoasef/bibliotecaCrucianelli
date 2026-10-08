# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primario: mecánico de concesionario en el campo.** Está al lado de una sembradora, con el celular en la mano (a veces con guantes o las manos sucias), al sol y con mala señal. Necesita encontrar el manual, despiece, instructivo o video correcto en segundos. Unas 70 concesionarias.
- **Personal de fábrica** (Crucianelli, Armstrong, Santa Fe): ve toda la documentación, incluida la "Solo fábrica" (planos). Usa celular y computadora.
- **Cliente final** (productor que usa la máquina): entra sin cuenta y ve solo lo marcado para clientes.
- **Admin** (responsable de la biblioteca): carga y clasifica documentos desde la computadora.

## Product Purpose

Biblioteca Técnica Crucianelli: una capa de organización, búsqueda y acceso sobre la documentación técnica que vive en Google Drive. Flujo central: **Buscar → Filtrar → Encontrar → Abrir**. Éxito = el mecánico abre el documento correcto sin saber dónde estaba guardado.

## Positioning

La documentación oficial de fábrica, organizada por las máquinas Crucianelli (segmento → línea → modelo: Gringa, Plantor, Dómina, Pionera, Drilor, Mixia…), con búsqueda dentro del texto de los PDFs, en español y tolerante a errores de tipeo.

## Operating Context

- Mobile first: celular en el campo, señal mala, luz solar directa. También escritorio en taller y oficina.
- Documentos: manuales, instructivos, procedimientos, videos, planos, despieces, fichas técnicas, boletines, solución de problemas.
- Clasificación: máquinas, producto (Sembradoras, Fertilizadoras, Tecnología, Accesorios siembra), tipo, sistema, tema, etiquetas. Estados vigente / obsoleto.

## Capabilities and Constraints

- Next.js + Tailwind v4 + shadcn/ui; ver `CLAUDE.md` y `docs/`.
- Páginas livianas; nada que dependa de hover; objetivos táctiles de 44 px como mínimo.
- Solo tema claro en el MVP.
- Fuera de alcance: IA, chat, recomendaciones, analítica avanzada, offline.

## Brand Commitments

- Marca **Crucianelli** (fabricante de sembradoras desde 1956). Logo: isotipo "C" de doble trazo + wordmark CRUCIANELLI en mayúsculas. Se usa el logo normal, no el de 70 años.
- Logo vectorial (SVG) pendiente de conseguir; mientras tanto, el PNG blanco del sitio oficial.
- Voz: español rioplatense con voseo, directa y cercana al productor ("Encontrá", "Buscá").

## Evidence on Hand

- Logo blanco PNG del sitio oficial (300×69) e isotipo "C" sobre rojo provisto por el usuario.
- Sin manual de marca. Sin fotos de producto propias en el repo.

## Product Principles

1. El documento correcto en la menor cantidad de toques.
2. Legible al sol y operable con una mano.
3. La máquina es el punto de partida: el mecánico piensa en "Gringa V", no en carpetas.
4. Permisos siempre en el servidor; la interfaz nunca es la seguridad.

## Accessibility & Inclusion

Contraste alto para uso a pleno sol (texto secundario 7:1), tipografía base de 16 px, objetivos táctiles de 44 px, respeto de `prefers-reduced-motion`.
