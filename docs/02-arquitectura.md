# 02 · Arquitectura

## Visión general

```
 Celular / PC
      │  HTTPS
      ▼
 ┌──────────────────────────── VPS de la empresa ────────────────────────────┐
 │  Reverse proxy (Caddy o Nginx, HTTPS)                                     │
 │      │                                                                     │
 │      ▼                                                                     │
 │  Next.js (App Router)  ── auth, permisos, búsqueda, panel admin            │
 │      │            │                                                        │
 │      ▼            ▼                                                        │
 │  PostgreSQL    Worker de extracción de texto (PDF → texto / OCR)           │
 └──────┼───────────────┼─────────────────────────────────────────────────────┘
        │               │   Descarga de archivos públicos (link)
        ▼               ▼
              Google Drive (depósito de archivos)
```

Todo corre en la VPS de la empresa con Docker Compose, porque se manejan datos sensibles (planos). Drive es solo el depósito: toda la organización vive en Postgres.

## Stack

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Server Components para páginas livianas; Route Handlers para archivos |
| Base de datos | PostgreSQL 16+ | Extensiones `unaccent`, `pg_trgm` |
| ORM | Drizzle (driver `postgres`) | Migraciones versionadas con `drizzle-kit`, SQL cercano (útil para `tsvector`) |
| Auth | Better Auth | Email + contraseña, sesiones en DB, roles |
| UI | Tailwind CSS v4 + shadcn/ui (Radix, Lucide) | Componentes accesibles y livianos |
| Mail | SMTP de la empresa (Nodemailer) | Invitaciones y recuperación de contraseña |
| Archivos | Google Drive (links públicos) | Sin Google Cloud: la app descarga del lado del servidor los archivos compartidos "con el vínculo" (ver abajo) |

Elecciones confirmadas en la fase 0.

## Google Drive

> **Decisión (2026-10-05):** no se usa Google Cloud ni cuenta de servicio. Los archivos se incorporan **pegando su link de Drive**, con acceso general "Cualquier persona con el vínculo" (Lector). La mayoría del material ya es público en la empresa; lo sensible (planos) se carga como "Solo fábrica" y la app solo lo muestra a fábrica.
>
> - La app descarga el archivo del lado del servidor (`drive.usercontent.google.com/download?id=…`) y lo sirve por `/api/archivos/[id]` con los mismos permisos de siempre: el link de Drive de PDFs y planos **no llega al celular** (regla 3 de `CLAUDE.md`). Riesgo aceptado: quien consiga el link por fuera de la app (por ejemplo, desde Drive) puede abrir el archivo sin usuario.
> - Sin API no se pueden listar carpetas: no hay explorador, se pegan links de archivos. Google Docs nativos no se aceptan (exportarlos a PDF).
> - Detección de cambios: sin `modifiedTime` de la API, se compara tamaño y `Last-Modified`; si el archivo deja de ser público o se borra, queda "no disponible".
> - El código de la cuenta de servicio (`GoogleDriveClient`) y la carpeta local (`DRIVE_LOCAL_DIR`, desarrollo) siguen disponibles; se elige por variables de entorno.
>
> Lo que sigue en esta sección describe el diseño original con cuenta de servicio.

### Cuenta de servicio

- Se crea una cuenta de servicio en Google Cloud con la Drive API habilitada.
- Las carpetas raíz de documentación se comparten con el mail de la cuenta de servicio (lectura). Si la empresa usa unidades compartidas, se agrega la cuenta como miembro; las llamadas a la API deben usar `supportsAllDrives=true` e `includeItemsFromAllDrives=true`.
- Credenciales en variables de entorno, nunca en el repositorio.

### Qué se guarda

- Se guarda el **`drive_file_id`**, no la URL. El ID no cambia si el archivo se mueve de carpeta o se renombra.
- También se guardan `mime_type`, tamaño y `modifiedTime` de Drive para detectar cambios.

### Modos de acceso a archivos

Cada archivo tiene un campo `modo_acceso`:

**`servidor`** (por defecto para PDFs, imágenes, planos y todo lo que no sea video)

- El archivo queda privado en Drive.
- Se sirve solo por `GET /api/archivos/[id]`, que:
  1. determina quién mira: el usuario de la sesión o, sin sesión, un cliente final (acceso libre; con límite de 200 archivos por hora por IP para cuidar el ancho de banda),
  2. verifica que pueda ver el documento al que pertenece el archivo (misma función de permisos que el resto de la app),
  3. registra el acceso en `accesos`,
  4. hace streaming desde Drive (`files.get?alt=media`) hacia el cliente, sin guardar el archivo en disco.
- Debe soportar cabeceras `Range` para que los PDFs grandes se puedan ver sin descargar todo.
- `?descargar=1` → `Content-Disposition: attachment`; sin el parámetro → `inline` (visor).
- La descarga está permitida para todos los roles que pueden ver el documento.

**`publico`** (por defecto para videos)

- El video ya tiene link público en Drive (así funciona hoy).
- Se embebe con el reproductor de Drive (`https://drive.google.com/file/d/{id}/preview`) **solo dentro de la ficha**, renderizada del lado del servidor para usuarios con permiso.
- Siempre se muestra un botón "Abrir en Drive" como respaldo, porque el reproductor embebido a veces falla en celulares.
- Si un video pertenece a un documento "Solo fábrica", el admin debe ponerlo en modo `servidor`. El panel de admin muestra una advertencia si detecta un archivo `publico` en un documento que no está marcado ni para concesionarios ni para clientes.

### Explorador de Drive en el admin

- El admin navega carpetas desde el panel (listado vía `files.list` con `q = "'<folderId>' in parents and trashed = false"`).
- Selecciona archivos y los incorpora: se crea un `documento` en estado `borrador` con un `archivo` por cada selección (o varios archivos en un mismo documento, ver `05-pantallas.md`).
- Los archivos ya incorporados se marcan en el explorador para no duplicarlos (`archivos.drive_file_id` es único).
- Carpetas raíz permitidas configurables (`DRIVE_ROOT_FOLDER_IDS`), para no recorrer todo el Drive.

### Implementación (fase 3)

- `src/lib/drive`: interfaz `DriveClient` con dos implementaciones. **Google** (REST de Drive v3 con JWT de la cuenta de servicio, scope `drive.readonly`) cuando hay credenciales; **local** (`DRIVE_LOCAL_DIR`: una carpeta del disco cuyas subcarpetas son las raíces) para desarrollar y probar sin credenciales.
- El explorador y la incorporación verifican que cada carpeta/archivo esté **dentro de una raíz permitida** recorriendo sus padres (`pathFromRoot`).
- Los Google Docs nativos se sirven exportados a PDF (sin `Range`).
- `/api/archivos/[id]` muestra inline solo tipos seguros (PDF, imágenes salvo SVG, texto, video); el resto (HTML, SVG…) se fuerza a descarga para que un archivo de Drive no pueda ejecutar scripts en el dominio de la app. Siempre `X-Content-Type-Options: nosniff`.
- Un visor de PDF hace muchos pedidos con `Range`: en `accesos` se registra solo el primero (sin rango o `bytes=0-`).
- Videos públicos: el reproductor de Drive se carga recién al tocar "Reproducir" (ahorra datos con mala señal) y ese toque registra el acceso `video`.
- El admin tiene "Ver como concesionario" y "Ver como cliente" en la ficha para revisar qué ve cada uno.

### Detección de cambios

- Tarea periódica (por ejemplo, cada noche) que consulta `modifiedTime` de los archivos incorporados.
- Si un archivo cambió en Drive: se actualizan los metadatos, se vuelve a extraer el texto y se marca para que el admin lo revise.
- Si un archivo fue borrado o la cuenta perdió acceso: se marca como no disponible y se avisa en el panel.
- Nunca se incorporan archivos nuevos automáticamente.

## Autenticación y permisos

### Flujo de cuentas

1. El admin crea el usuario (nombre, email, rol, concesionario si corresponde).
2. El sistema envía una invitación por mail con un link de un solo uso y vencimiento (por ejemplo, 7 días).
3. El usuario define su contraseña y entra.
4. Recuperación de contraseña por mail.
5. El admin puede desactivar usuarios (y concesionarios enteros): un usuario desactivado o de un concesionario desactivado no puede iniciar sesión y sus sesiones se invalidan.

No hay registro público. Los clientes finales no tienen cuenta: consultan sin login (ver "Acceso libre de clientes").

### Pausa por inactividad

- Una cuenta de fábrica o de concesionario que no usa la app durante `INACTIVIDAD_DIAS` días (90 por defecto; 0 la desactiva) queda **pausada**. No aplica al admin ni a quien nunca ingresó (para eso vence la invitación).
- Como las sesiones se renuevan solas con el uso, la inactividad se mide con `usuarios.ultima_actividad`, que `getCurrentUser` actualiza como mucho una vez por hora (además de `ultimo_ingreso` al iniciar sesión).
- Se detecta al iniciar sesión (`session.create.before`) y en cada request (`getCurrentUser`): se guarda `pausado_en`, se cierran sus sesiones y el login muestra "Tu cuenta está pausada… pedile a fábrica que la vuelva a habilitar". No hace falta una tarea programada; el listado del admin calcula el estado con la misma regla (`pausadoSql`).
- El admin la rehabilita desde la ficha del usuario ("Volver a habilitar"): se borra `pausado_en` y el plazo vuelve a contar desde ese momento. La contraseña no cambia.

### Acceso libre de clientes

- `proxy.ts` solo exige cookie de sesión en `/admin` y `/cuenta`. El inicio, `/buscar`, `/maquinas`, las fichas, `/api/archivos/[id]` y las fotos de líneas se pueden abrir sin sesión.
- Esas páginas usan `getViewer()`: devuelve el usuario y el `viewer` para la visibilidad, que sin sesión es `CLIENTE` (`{ rol: "cliente" }`). Nunca se arma un viewer a partir de datos del request.
- Los accesos y búsquedas de clientes se registran con `usuario_id` null. Los clientes no tienen búsquedas recientes propias.
- Límites por IP sin sesión: 200 archivos por hora (`/api/archivos/[id]`) y 300 búsquedas por hora (`/buscar`; pasado el límite no se busca ni se registra y se avisa cuándo volver a probar). Son generosos porque muchos celulares salen por la misma IP de la operadora.
- Navegación sin sesión: Inicio, Buscar, Máquinas e "Ingresar" (en lugar de "Cuenta").

### Implementación (fase 1)

- **No se expone el handler HTTP de Better Auth** (`/api/auth/*`). Login, logout, invitaciones y recuperación pasan por Server Actions que llaman a `auth.api.*` del lado del servidor. Menos superficie (no hay endpoint de registro alcanzable) y los formularios funcionan sin JavaScript.
- **Rate limiting propio en Postgres** (`limites_tasa`), porque el de Better Auth solo aplica a su handler HTTP: login 5 intentos por email y 30 por IP cada 15 minutos; recuperación 3 por email y 10 por IP por hora; reenvío de invitación 5 por usuario por hora. La IP se toma de `X-Forwarded-For`, que debe setear el proxy.
- **Invitación** = token de restablecimiento de Better Auth con vencimiento de 7 días, de un solo uso; reenviarla invalida el anterior. Al definir la contraseña, el usuario entra directo.
- **Bloqueo:** el hook `session.create.before` impide iniciar sesión a usuarios o concesionarios inactivos y a cuentas pausadas por inactividad; además `getCurrentUser` lo verifica en cada request, y al desactivar o pausar se borran las sesiones.
- **Permisos:** `proxy.ts` solo hace un chequeo optimista (hay cookie de sesión) en `/admin` y `/cuenta`. La verificación real es `requireUser()` / `requireAdmin()` en cada página **y en cada Server Action** (las páginas de consulta usan `getViewer()`). A los no admin, `/admin` les responde 404.
- Sesiones de 30 días, renovadas con el uso (los mecánicos no deberían tener que volver a loguearse en el campo).

### Reglas de visibilidad

Implementadas en **una única función** del servidor (`documentVisibilityFilter(viewer)`), usada por la búsqueda, la navegación, la ficha y `/api/archivos/[id]`. Cada documento se marca para uno o más públicos además de fábrica (`visible_concesionarios`, `visible_clientes`):

| Lector | Ve |
|---|---|
| admin | Todo, incluidos borradores |
| fabrica | `estado IN ('vigente', 'obsoleto')` |
| concesionario | `estado IN ('vigente', 'obsoleto')` **y** `visible_concesionarios` |
| cliente (sin sesión) | `estado IN ('vigente', 'obsoleto')` **y** `visible_clientes` |

Además, nadie fuera del admin ve documentos asociados únicamente a máquinas de un segmento o línea desactivados (por ejemplo, fertilizadoras mientras estén ocultas). Un documento sin máquinas (por ejemplo, de Tecnología o Accesorios, asociado solo a un producto) no depende de esta regla.

## Búsqueda

Toda la búsqueda se resuelve en Postgres, sin servicios externos.

### Configuración

- Configuración de texto propia, por ejemplo `es_unaccent`, basada en `spanish` con `unaccent` para que "regulacion" encuentre "regulación".
- Columna `documentos.busqueda` (`tsvector`) con pesos:
  - **A:** título
  - **B:** etiquetas, nombres de máquinas (línea y modelo), tipo, sistemas, temas, productos
  - **C:** descripción
  - **D:** texto extraído de los archivos
- Índice GIN sobre `busqueda`.
- Índice trigram (`pg_trgm`) sobre título y etiquetas para tolerar errores de tipeo ("dosificadr").
- Tabla `vocabulario` con todas las palabras de los documentos (título, descripción, taxonomía y texto de los archivos), sin acentos y sin raíz, con índice trigram: sirve para corregir errores de tipeo en cualquier parte del documento ("dosificacin" → "dosificacion").

### Actualización del índice

`busqueda` depende de varias tablas, así que no puede ser una columna generada. Se recalcula con una función `rebuildDocumentSearch(documentoId)` llamada al:

- guardar o publicar un documento,
- cambiar sus etiquetas, máquinas, sistemas, temas o productos,
- terminar la extracción de texto de uno de sus archivos,
- renombrar una entrada de taxonomía (recalcular los documentos afectados).

### Consulta

1. Se arma la consulta con `websearch_to_tsquery('es_unaccent', q)` (soporta comillas y `-excluir`).
2. Si no hay resultados, cada palabra que no está en `vocabulario` se reemplaza por la más parecida que sí está y se repite la búsqueda; la pantalla muestra "Buscamos «X» porque «Y» no aparece en la biblioteca".
3. Si hay pocos resultados, se complementa con coincidencias por similitud trigram sobre título y etiquetas.
4. Se aplican los filtros (producto, máquina, tipo, sistema, tema, etiqueta) y el filtro de visibilidad.
5. Orden: `ts_rank_cd` → documentos `vigente` antes que `obsoleto` → documentos específicos (un solo sistema/tema, asociados a modelo) antes que generales → más recientes.
6. Se devuelve un fragmento resaltado con `ts_headline` sobre título/descripción.
7. Si no hay resultados, se registra en `busquedas` con `cantidad_resultados = 0`.

### Filtro por máquina

Filtrar por un **modelo** devuelve los documentos asociados a ese modelo **y** los asociados a su línea completa. Filtrar por una **línea** devuelve los de la línea y los de cualquiera de sus modelos.

### Implementación (fase 4)

- `rebuild_document_search(uuid)` es una función SQL (migración 0005); desde TypeScript se llama con `rebuildDocumentSearch` / `rebuildSearchForTaxonomia` (`src/lib/search/reindex.ts`). Un documento asociado a una línea completa indexa también los nombres de sus modelos, y uno asociado a un modelo, el de su línea; por eso renombrar una línea o un modelo recalcula ambos lados.
- El texto extraído entra al índice con un tope de 300.000 caracteres por documento (límite de tamaño de `tsvector`).
- La consulta está en `src/lib/search/search.ts`. El complemento por errores de tipeo usa `word_similarity` ≥ 0,5 sobre el título y las etiquetas cuando hay menos de 5 resultados; esos resultados se muestran aparte ("Resultados parecidos").
- Corrección de errores de tipeo (migración 0008): `rebuild_document_search` también agrega las palabras del documento a `vocabulario` (config `simple` sobre `f_unaccent_lower`; solo letras, de 4 a 30 caracteres). La tabla solo crece. Un candidato tiene que estar a lo sumo a 1 letra de distancia (`levenshtein`, `fuzzystrmatch`) en palabras de 4 o 5 letras, y a 2 en las más largas. Además tiene que aparecer en algún documento visible para el usuario (`documentVisibilityFilter`), así la corrección no revela palabras de documentos ocultos y las palabras de documentos borrados nunca se proponen.
- El fragmento resaltado sale de la descripción o, si no hay, del texto de los archivos (primeros 20.000 caracteres). Se marca con caracteres de control, no con HTML, y el cliente los convierte en `<mark>`.
- Se registran las búsquedas con texto o filtros (solo la primera página).

### Páginas

- El worker conserva los saltos de página (`\f`) en `archivos.texto_extraido`: `pdftotext` los pone al final de cada página y el OCR se junta página por página con el texto de `pdftotext` (`mergePages`).
- Después de extraer, `rebuild_archivo_paginas(archivo_id)` (migración 0010) guarda un `tsvector` por página en `archivo_paginas`. Solo para PDFs, y las páginas vacías no se guardan.
- En los resultados de texto completo, cada documento trae sus PDFs con las páginas donde coincide la consulta (las primeras 5 y cuántas más). Una búsqueda de varias palabras marca solo las páginas que las tienen todas.
- Se muestra el número de página y no un link a la página: `#page=N` no funciona en los visores de PDF de muchos celulares.

### Búsquedas recientes

- `recentSearches` (`src/lib/search/search.ts`): las últimas 5 búsquedas con texto del usuario que dieron resultados, sin repetir (sin distinguir acentos ni mayúsculas), tomadas de las últimas 100 de `busquedas`. Se muestran en el inicio y en `/buscar` sin búsqueda.

## Extracción de texto

- Proceso separado (worker) para no bloquear las requests: cola simple en Postgres (`archivos.estado_extraccion = 'pendiente'`) consumida por un proceso Node.
- PDFs con texto: `pdftotext` (poppler) o `pdfjs`.
- PDFs escaneados (poco o ningún texto extraído): OCR con Tesseract en español (`tesseract-ocr-spa`) sobre las páginas rasterizadas. Es lento; procesar de a uno.
- Google Docs nativos: exportar como texto plano con `files.export`.
- Videos e imágenes: sin extracción (se buscan por título, descripción y etiquetas).
- Guardar el texto en `archivos.texto_extraido` y al terminar llamar a `rebuildDocumentSearch`.
- Límite razonable de texto por archivo (por ejemplo, 1 MB) para no inflar el índice.

Implementación: `src/worker/index.ts` (contenedor `Dockerfile.worker` con `poppler-utils` y `tesseract-ocr-spa`). Toma trabajos con `FOR UPDATE SKIP LOCKED`; si un PDF tiene menos de ~80 caracteres útiles por página pasa a OCR (hasta `OCR_MAX_PAGES`, 80 por defecto). Al arrancar devuelve a la cola lo que quedó "procesando" hace más de 15 minutos. El admin puede reintentar archivos con error o sin texto.

## Infraestructura

### Docker Compose

Servicios: `app` (Next.js), `worker` (extracción), `db` (Postgres) y `proxy` (Caddy con HTTPS automático, o el Nginx que ya use la empresa).

### Operación

- **Backups:** `pg_dump` diario con retención (por ejemplo, 14 diarios + 8 semanales), copiado fuera de la VPS. Probar la restauración al menos una vez antes de salir a producción.
- **HTTPS** obligatorio.
- **Logs** de la app y del worker con rotación.
- Rate limiting en login e invitaciones.

### Ancho de banda

Los PDFs y planos pasan por la VPS. Los videos no (van por link público de Drive). Verificar el ancho de banda de subida de la VPS antes del lanzamiento.

## Variables de entorno

```
DATABASE_URL=
BETTER_AUTH_SECRET=
APP_URL=
ADMIN_EMAIL=

GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
DRIVE_ROOT_FOLDER_IDS=          # IDs separados por coma

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
MAIL_TO_CONSOLE=                # solo pruebas locales: mails a la consola sin SMTP
```
