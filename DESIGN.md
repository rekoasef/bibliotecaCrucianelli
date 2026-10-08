---
name: Biblioteca Técnica Crucianelli
description: Documentación técnica de sembradoras Crucianelli, pintada como la máquina.
colors:
  rojo-crucianelli: "#e30613"
  rojo-presionado: "#c00511"
  pizarra: "#222d35"
  pizarra-elevado: "#2f3c46"
  texto-sobre-pizarra: "#b9c3ca"
  fondo-frio: "#f2f4f5"
  tinta: "#18181b"
  panel: "#ffffff"
  gris-suave: "#e3e7ea"
  gris-hover: "#eef1f3"
  texto-secundario: "#4a5660"
  borde: "#d3d9dd"
  borde-campo: "#9aa5ad"
  error: "#b91c1c"
typography:
  display:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
  calco:
    fontFamily: "Montserrat, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "0.025em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.05em"
rounded:
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-md: "24px"
  stack-sm: "8px"
  stack-md: "16px"
  section: "40px"
  section-md: "56px"
  header: "56px"
  bottom-nav: "64px"
  touch: "44px"
components:
  button-primary:
    backgroundColor: "{colors.rojo-crucianelli}"
    textColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  button-primary-active:
    backgroundColor: "{colors.rojo-presionado}"
  button-sobre-franja:
    backgroundColor: "{colors.pizarra}"
    textColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    height: "56px"
    padding: "0 24px"
  button-sobre-franja-hover:
    backgroundColor: "{colors.pizarra-elevado}"
  input-busqueda:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    height: "48px"
  input-busqueda-grande:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    height: "56px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    height: "48px"
    padding: "0 16px 0 12px"
  chip-sobre-franja:
    backgroundColor: "{colors.rojo-crucianelli}"
    textColor: "{colors.panel}"
    rounded: "{rounded.full}"
    height: "44px"
    padding: "0 16px"
  card-resultado:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "16px"
  fila-linea:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.tinta}"
    typography: "{typography.calco}"
    height: "64px"
    padding: "12px 16px"
  barra-pizarra:
    backgroundColor: "{colors.pizarra}"
    textColor: "{colors.texto-sobre-pizarra}"
    height: "56px"
  nav-inferior:
    backgroundColor: "{colors.pizarra}"
    textColor: "{colors.texto-sobre-pizarra}"
    height: "64px"
---

# Design System: Biblioteca Técnica Crucianelli

## Overview

**Creative North Star: "Pintura de máquina"**

La app se pinta como una sembradora Crucianelli. El cromo es gris pizarra (la barra superior y la navegación inferior, como el sitio oficial); el rojo Crucianelli aparece como **una sola franja de borde a borde por pantalla**, la cabecera de la página, con el doble trazo inclinado del isotipo de fondo, igual que la calco sobre la tolva. Los nombres de máquina (GRINGA, PLANTOR, DOMINA…) se escriben como calcos: Montserrat ExtraBold en mayúsculas, marcados con el doble trazo rojo. Todo lo demás es un fondo claro frío con paneles blancos y texto de alto contraste, pensado para leerse al sol con una mano.

La densidad es de herramienta de campo: objetivos táctiles grandes (44 px como mínimo, filas de máquina de 64 px), listas con separadores en lugar de grillas de tarjetas, y nada que dependa de hover. El sistema rechaza la grilla genérica de tarjetas grises y el rojo esparcido por toda la pantalla: el rojo es pintura de identidad y de acción, no decoración.

Solo tema claro. El movimiento se limita a transiciones de color en estados (hover, presionado) y se anula con `prefers-reduced-motion`.

**Key Characteristics:**
- Cromo pizarra arriba y abajo; una franja roja con doble trazo por pantalla.
- Nombres de máquina como calcos: Montserrat 800, mayúsculas, con el doble trazo.
- Cuerpo en Atkinson Hyperlegible Next a 16 px, contraste 7:1 o más en texto secundario.
- Listas en paneles blancos con separadores; chips redondos para filtros y tipos.
- Plano: profundidad por tono (fondo frío, panel blanco, borde), casi sin sombras.

## Colors

Una paleta de dos voces de marca (rojo y pizarra) sobre neutros fríos con un dejo del pizarra.

### Primary
- **Rojo Crucianelli** (rojo-crucianelli): el rojo de la máquina. Rellena la franja de cabecera de cada página y los botones primarios, la barrita activa de la navegación y el doble trazo. Con texto blanco da 4.9:1, por eso sobre la franja todo el texto va en blanco y en peso semibold o más.
- **Rojo presionado** (rojo-presionado): estado presionado del botón primario y el único rojo permitido para **texto** sobre fondo claro (5.8:1): links como "Ver todas", el tipo de documento en las tarjetas, íconos de tipo.

### Secondary
- **Pizarra** (pizarra): cromo de la app. Barra superior, navegación inferior, barra de la pantalla de ingreso y `theme-color` del navegador. También el botón "Buscar" cuando vive dentro de la franja roja, para que no se pierda rojo sobre rojo.
- **Pizarra elevado** (pizarra-elevado): hover y presionado sobre pizarra.
- **Texto sobre pizarra** (texto-sobre-pizarra): ítems de navegación inactivos y el rótulo "Biblioteca técnica" del logo (7.8:1).

### Neutral
- **Fondo frío** (fondo-frio): fondo de toda la app.
- **Panel** (panel): tarjetas, listas, campos, chips.
- **Tinta** (tinta): texto principal.
- **Texto secundario** (texto-secundario): descripciones, metadatos, títulos de segmento (7.5:1 sobre blanco).
- **Gris suave** (gris-suave): fondos secundarios y contadores dentro de chips; presionado de filas.
- **Gris hover** (gris-hover): hover de filas y presionado de tarjetas.
- **Borde** (borde): bordes de paneles y separadores de listas.
- **Borde de campo** (borde-campo): borde de los campos de texto, más oscuro que el de los paneles para que se lea como "acá se escribe".
- **Error** (error): acciones destructivas y estados inválidos.

### Named Rules
**The Una Franja Rule.** Cada pantalla tiene exactamente una superficie roja grande: la franja de cabecera, de borde a borde. El resto del rojo son acciones y marcas chicas (botón, doble trazo, barrita activa).

**The Rojo Fuerte para Texto Rule.** El rojo de marca nunca se usa como color de texto sobre fondo claro; para eso está el rojo presionado. Sobre la franja, el texto es siempre blanco.

**The Pizarra sobre Rojo Rule.** Un botón dentro de la franja es pizarra, no rojo. Los chips y etiquetas dentro de la franja son contorno blanco al 70% con texto blanco.

## Typography

**Display Font:** Montserrat 700/800 (con system-ui), la del sitio de Crucianelli.
**Body Font:** Atkinson Hyperlegible Next (con system-ui), diseñada para legibilidad máxima.

**Character:** Montserrat ExtraBold en mayúsculas habla como la calco de la máquina; Atkinson se encarga de todo lo que se lee de corrido, al sol, en pantallas chicas.

### Hierarchy
- **Display** (800, 36 px en celular a 60 px en escritorio, interlineado 1, mayúsculas, tracking leve): el nombre de la línea en su página (DOMINA). Solo nombres de máquina.
- **Headline** (800, 28 px en celular, hasta 48 px en el inicio, interlineado 1.1): el titular de la franja ("¿Qué documentación necesitás?", "Máquinas", título del documento a 24–36 px). Frase normal, no mayúsculas; se corta en `max-w-[16ch]` en el inicio.
- **Title** (800, 20–24 px): títulos de sección sobre el fondo ("Por máquina", "Por tipo de documento") y títulos de grupo; "Filtros" a 18 px.
- **Calco** (800, 20 px, mayúsculas, tracking leve): nombres de línea en las filas y en la franja de la ficha (18 px, con doble trazo blanco).
- **Body** (400, 16 px, 1.5): texto corrido y descripciones; base fija de 16 px.
- **Body strong** (700, 18 px): título del documento en la tarjeta de resultado.
- **Label** (700, 14 px, mayúsculas, tracking amplio): nombre del segmento sobre cada lista (GRANOS GRUESOS). Los metadatos de tarjeta van a 14 px semibold, el nombre de máquina en mayúsculas.

### Named Rules
**The Calco Rule.** Mayúsculas en Montserrat ExtraBold son solo para nombres de máquina y línea (y el label de segmento). Los titulares y títulos van en frase normal.

**The Atkinson para Leer Rule.** Nada que se lea en párrafo va en Montserrat; nada de texto por debajo de 14 px salvo los rótulos de la navegación inferior (12 px bajo un ícono de 24 px).

## Layout

Contenedor centrado de 1152 px (`max-w-6xl`) con canaleta de 16 px en celular y 24 px desde `md` (768 px). La barra superior mide 56 px y es sticky; en celular la navegación inferior fija mide 64 px más el `safe-area-inset-bottom`, y el contenido reserva ese alto abajo. Desde `md` la navegación pasa al header como links con ícono.

La franja rompe el contenedor para ir de borde a borde (`mx-[calc(50%-50vw)]`) y se pega a la barra superior; su contenido vuelve a alinear con la canaleta de la página. Las secciones se separan 40 px en celular y 56 px en escritorio; dentro de una sección, 16 px entre título y contenido y 8–12 px entre elementos.

Las listas de máquinas son de una columna en celular y dos columnas de segmentos en escritorio; las tarjetas de resultado, una columna en celular y dos desde `md`. La barra de filtros de búsqueda aparece como columna lateral de 288 px desde `lg` (1024 px). Las pantallas de ingreso usan una columna de 448 px.

## Elevation & Depth

Sistema plano. La profundidad sale del tono: fondo frío, paneles blancos con borde de 1 px, cromo pizarra arriba y abajo. Las tarjetas no tienen sombra; el hover oscurece el borde y el presionado tiñe el fondo.

### Shadow Vocabulary
- **Campo en la franja** (`box-shadow: 0 2px 8px rgb(34 45 53 / 0.25)`): el buscador blanco dentro de la franja roja, para despegarlo del rojo. Solo ahí.
- **Campo normal** (`shadow-xs` de Tailwind): campos de texto sobre el fondo claro.
- **Tarjeta de ingreso** (`shadow-sm` de Tailwind): el panel del formulario de ingreso.

### Named Rules
**The Plano por Tono Rule.** Las tarjetas y listas no llevan sombra. Si algo necesita separarse, primero borde y tono; la sombra queda para campos de texto.

## Shapes

Esquinas suaves y consistentes: 14 px en paneles, listas, tarjetas y buscador; 10 px en botones y links del header; 18 px en el panel de ingreso; píldora completa en chips y etiquetas. Bordes de 1 px en todos los paneles; borde punteado para estados vacíos.

La única geometría filosa es el **doble trazo**: dos paralelogramos inclinados (SVG 14×16) que se repiten como fondo de la franja (dos bandas blancas al 13% a 112°), como marca de cada nombre de máquina y como barrita activa de la navegación inferior (4 px de alto, inclinada −22°). En el header de escritorio lo activo es una línea roja recta de 3 px pegada al borde inferior de la barra.

## Components

### Buttons
Directos y grandes.
- **Shape:** esquinas de 10 px; alto 44 px por defecto, 48 px en `lg`, 56 px en el buscador grande.
- **Primary:** rojo Crucianelli con texto blanco a 16 px; hover al 90%, presionado en rojo presionado y baja 1 px.
- **Sobre franja:** pizarra con texto blanco; hover y presionado en pizarra elevado; foco con anillo blanco al 60%.
- **Focus:** anillo de 3 px en rojo al 50%.
- **Outline / Ghost / Secondary:** los de shadcn con los tokens neutros; se usan en el admin y en acciones secundarias.

### Chips
- **Tipo de documento y filtros:** píldora blanca con borde, 48 px de alto (44 px los filtros), ícono de tipo en rojo presionado a la izquierda, texto semibold. Hover oscurece el borde; presionado a gris hover.
- **Filtro activo:** borde rojo al 40% con fondo rojo al 5%.
- **Sobre franja:** contorno blanco al 70%, texto blanco, hover blanco al 10% (búsquedas recientes, accesos de la línea).
- **Contador:** píldora gris suave con números tabulares dentro del chip.

### Cards / Containers
- **Corner Style:** 14 px.
- **Background:** panel blanco sobre fondo frío.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1 px borde; hover a tinta al 30%.
- **Internal Padding:** 16 px (20 px en estados vacíos).
- **Tarjeta de resultado:** título en body strong, descripción en hasta tres líneas, y una fila de metadatos: tipo en rojo presionado con su ícono, máquina en mayúsculas, formato en texto secundario. "Obsoleto" va como píldora de contorno junto al título.

### Inputs / Fields
- **Buscador:** campo blanco con ícono de lupa a la izquierda, esquinas de 14 px, 48 px de alto (56 px y texto de 18 px en la versión grande). Borde en borde de campo; foco con borde rojo y anillo rojo al 25%.
- **Buscador en la franja:** sin borde, con la sombra de campo en la franja; foco con anillo pizarra al 60%.
- Es un formulario GET que funciona sin JavaScript; el botón "Buscar" siempre está a la derecha.

### Navigation
- **Barra superior:** pizarra, 56 px, logo blanco oficial con un separador y el rótulo "Biblioteca técnica" en dos líneas.
- **Celular:** navegación inferior pizarra de 4 o 5 ítems, ícono de 24 px sobre texto de 12 px; inactivo en texto sobre pizarra, activo en blanco bold con trazo 2.5 y la barrita roja inclinada arriba.
- **Escritorio:** links de 44 px con ícono de 20 px en el header; hover pizarra elevado; activo en blanco con línea roja de 3 px abajo.

### Franja (componente firma)
La cabecera de cada página: rojo Crucianelli de borde a borde con el doble trazo de fondo, texto blanco, padding de 24/28 px (40 px en escritorio). Contiene el titular (headline o display), y según la página el buscador en tono franja, las búsquedas recientes, la vuelta atrás o los metadatos del documento. Va siempre primera, hija directa del contenido de la página.

### Fila de línea (componente firma)
Lista de líneas por segmento: label de segmento arriba, panel blanco con separadores, cada fila de 64 px con el doble trazo rojo (o la foto de la línea, 80×60 con esquinas de 8 px), el nombre como calco y un chevron de 24 px en texto secundario.

## Do's and Don'ts

### Do:
- **Do** abrir cada página con una única Franja roja de borde a borde y poner ahí el titular.
- **Do** escribir los nombres de máquina como calco (Montserrat 800, mayúsculas) con el doble trazo al lado.
- **Do** usar rojo presionado para cualquier texto o ícono rojo sobre fondo claro.
- **Do** mantener todo objetivo táctil en 44 px o más (filas de línea 64 px, chips 48 px).
- **Do** usar pizarra para el cromo (barra superior, navegación) y para botones dentro de la franja.
- **Do** separar con borde y tono, no con sombra.

### Don't:
- **Don't** poner una segunda superficie roja grande en la misma pantalla.
- **Don't** usar el rojo de marca como color de texto sobre fondo claro.
- **Don't** poner un botón rojo dentro de la franja roja.
- **Don't** usar Montserrat para párrafos ni mayúsculas para titulares que no sean nombres de máquina.
- **Don't** usar grises más claros que texto secundario para texto.
- **Don't** depender de hover para mostrar información o acciones.
- **Don't** escribir colores hex sueltos en los componentes; usar los tokens de `src/app/globals.css`.
