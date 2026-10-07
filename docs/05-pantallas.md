# 05 · Pantallas y flujos

## Principios de diseño

- **Mobile-first.** Se diseña primero para un celular de ~375 px y después se expande a escritorio.
- **Liviano.** Server Components por defecto; JavaScript en el cliente solo donde haga falta (buscador con sugerencias, filtros, formularios del admin). Nada de imágenes pesadas en listados.
- **Táctil.** Objetivos de al menos 44 px, nada que dependa de hover, filtros en un panel inferior (bottom sheet) en celular y en una columna lateral en escritorio.
- **Legible al sol.** Buen contraste, tipografía de base de 16 px como mínimo.
- **Marca Crucianelli.** Rojo `#E30613` como color de acento (aproximado, confirmar con el manual de marca), grises oscuros y fondo claro. El rojo se usa para acciones y acentos, no para grandes superficies.
- **El estado de la URL es la búsqueda.** Texto y filtros viven en los query params (`/buscar?q=dosificador&modelo=gringa-v&tipo=instructivo`), así se pueden compartir y el botón "atrás" funciona.
- **Estados vacíos útiles.** Sin resultados → sugerir quitar filtros o buscar por máquina.

## Usuario (fábrica y concesionario)

### Inicio `/`

- Buscador grande arriba, con foco directo en escritorio.
- Debajo, las últimas 5 búsquedas del usuario (con resultados, sin repetir) para repetirlas con un toque.
- Acceso por máquina: tarjetas de segmentos → líneas (con foto si hay).
- Accesos rápidos por tipo (Manuales, Despieces, Videos…).
- Últimos documentos publicados o actualizados.

### Resultados de búsqueda `/buscar`

- Buscador arriba, con el texto actual. Sin búsqueda ni filtros, debajo van las búsquedas recientes del usuario (igual que en el inicio).
- Chips de filtros activos, cada uno con su ✕, y "Limpiar filtros".
- Botón "Filtros" (bottom sheet en celular) con: máquina (segmento → línea → modelo), tipo, sistema, tema, etiquetas, e "Incluir obsoletos" (desactivado por defecto).
- Cantidad de resultados. Si la búsqueda se corrigió por un error de tipeo: "Buscamos «X» porque «Y» no aparece en la biblioteca".
- Tarjeta de resultado: título, tipo (ícono + texto), máquinas, fragmento con el texto resaltado, páginas del PDF donde aparece lo buscado ("Págs. 12, 40 y 47"; con el nombre del archivo si hay más de un PDF), formato (PDF/video) y badge "Obsoleto" si corresponde.
- Paginación con "Cargar más".

### Navegación por máquina `/maquinas/[linea]` y `/maquinas/[linea]/[modelo]`

- Encabezado con nombre (y foto) de la línea o modelo.
- Selector de modelo dentro de la línea.
- Documentos agrupados por tipo (Manuales, Instructivos, Despieces, Videos…), con contadores.
- Buscador acotado a esa máquina ("Buscar en Gringa V…").

### Ficha de documento `/documentos/[id]`

- Título, tipo, versión y fecha.
- Aviso destacado si es obsoleto: "Hay una versión más nueva → ver vigente".
- Máquinas, sistemas, temas y etiquetas como chips clickeables (llevan a la búsqueda con ese filtro).
- Descripción.
- Archivos:
  - **PDF:** botón principal "Ver" (abre `/api/archivos/[id]` en el visor nativo del navegador) y botón "Descargar".
  - **Video:** reproductor embebido de Drive + botón "Abrir en Drive".
  - **Imagen:** vista previa + descargar.
- Historial de versiones (si existe).
- Botón "Compartir" (copia el link de la ficha; quien lo abra igual necesita iniciar sesión y tener permiso).

### Cuenta

- Login `/login`: email y contraseña, "Olvidé mi contraseña".
- Aceptar invitación `/invitacion/[token]`: definir contraseña.
- Restablecer contraseña `/restablecer/[token]`.
- Mi cuenta: nombre, cambiar contraseña, cerrar sesión.

## Admin `/admin`

En escritorio, menú lateral. En celular, el admin funciona pero no es prioritario optimizarlo.

### Panel `/admin`

- Borradores pendientes de clasificar.
- Documentos que requieren revisión (archivo cambiado en Drive) y archivos no disponibles.
- Errores de extracción de texto.
- Búsquedas sin resultados más frecuentes de los últimos 30 días.
- Advertencias: videos públicos en documentos "Solo fábrica".

### Incorporar desde Drive `/admin/drive`

0. **Pegar links de Drive** (alternativa al explorador): uno o varios links de archivos, uno por línea. El link de una carpeta la abre en el explorador. Mismas validaciones (dentro de las raíces, sin duplicados); el archivo sigue privado y se lee con la cuenta de servicio.
1. Explorador de carpetas a partir de las raíces configuradas: migas de pan, carpetas, archivos con ícono, tamaño y fecha.
2. Los archivos ya incorporados se ven marcados y no se pueden volver a seleccionar.
3. Selección múltiple con casillas.
4. Al confirmar, dos opciones:
   - **"Un documento por archivo"** (lo habitual): crea N borradores.
   - **"Un documento con todos los archivos"**: por ejemplo, instructivo en PDF + su video.
5. Los borradores quedan con el título tomado del nombre del archivo (sin extensión) y se encola la extracción de texto.
6. Después de crear, se ofrece ir a clasificarlos.

### Documentos `/admin/documentos`

- Tabla con búsqueda y filtros por estado, tipo, máquina y visibilidad.
- Acciones: editar, publicar, nueva versión, marcar obsoleto, eliminar (solo borradores).

### Editar documento `/admin/documentos/[id]`

- Título, descripción, tipo, versión, fecha del documento.
- Máquinas: selector jerárquico en el que se puede marcar una línea completa o modelos puntuales.
- Sistemas y temas: selección múltiple (lo normal es uno).
- Etiquetas: input con autocompletado y creación al vuelo.
- Visibilidad: Concesionarios / Solo fábrica.
- Archivos: lista ordenable, modo de acceso por archivo, estado de extracción, agregar otro archivo desde Drive, quitar.
- Vista previa de cómo lo ve un concesionario.
- Botones: "Guardar borrador" y "Publicar" (valida los requisitos de `03-modelo-de-datos.md` y muestra qué falta).
- Productividad para la carga inicial: "Guardar y siguiente borrador".

### Nueva versión

Desde la ficha de un documento vigente: crea el borrador copiando la clasificación, el admin elige el archivo nuevo y al publicar el anterior queda obsoleto y vinculado (ver `03-modelo-de-datos.md`).

### Usuarios `/admin/usuarios`

- Tabla con filtros por rol, concesionario y activo.
- Crear usuario: nombre, email, rol, concesionario (obligatorio si el rol es concesionario) → envía la invitación.
- Reenviar invitación, desactivar o reactivar.
- Último ingreso.

### Concesionarios `/admin/concesionarios`

- Alta, edición, activar/desactivar.
- Desde cada concesionario: lista de sus usuarios y botón "Agregar mecánico".

### Máquinas `/admin/maquinas`

- Árbol segmento → línea → modelo: crear, editar, reordenar, activar/desactivar, foto opcional de la línea.

### Taxonomía `/admin/taxonomia`

- Pestañas para tipos, sistemas, temas y etiquetas: crear, renombrar, reordenar, activar/desactivar.
- Etiquetas: fusionar duplicadas.
- Al renombrar, recalcular el índice de búsqueda de los documentos afectados.

### Registros `/admin/registros`

- Accesos: filtrar por usuario, concesionario, documento y fechas.
- Búsquedas sin resultados: texto, cantidad de veces, última vez.
