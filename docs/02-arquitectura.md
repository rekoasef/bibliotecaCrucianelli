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
        │               │   Drive API v3 (cuenta de servicio)
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
| Archivos | Google Drive API v3 | Cuenta de servicio con acceso de lectura a las carpetas de documentación |

Elecciones confirmadas en la fase 0.

## Google Drive

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
  1. verifica la sesión,
  2. verifica que el usuario pueda ver el documento al que pertenece el archivo (misma función de permisos que el resto de la app),
  3. registra el acceso en `accesos`,
  4. hace streaming desde Drive (`files.get?alt=media`) hacia el cliente, sin guardar el archivo en disco.
- Debe soportar cabeceras `Range` para que los PDFs grandes se puedan ver sin descargar todo.
- `?descargar=1` → `Content-Disposition: attachment`; sin el parámetro → `inline` (visor).
- La descarga está permitida para todos los roles que pueden ver el documento.

**`publico`** (por defecto para videos)

- El video ya tiene link público en Drive (así funciona hoy).
- Se embebe con el reproductor de Drive (`https://drive.google.com/file/d/{id}/preview`) **solo dentro de la ficha**, renderizada del lado del servidor para usuarios con permiso.
- Siempre se muestra un botón "Abrir en Drive" como respaldo, porque el reproductor embebido a veces falla en celulares.
- Si un video pertenece a un documento "Solo fábrica", el admin debe ponerlo en modo `servidor`. El panel de admin muestra una advertencia si detecta un archivo `publico` en un documento de visibilidad `fabrica`.

### Explorador de Drive en el admin

- El admin navega carpetas desde el panel (listado vía `files.list` con `q = "'<folderId>' in parents and trashed = false"`).
- Selecciona archivos y los incorpora: se crea un `documento` en estado `borrador` con un `archivo` por cada selección (o varios archivos en un mismo documento, ver `05-pantallas.md`).
- Los archivos ya incorporados se marcan en el explorador para no duplicarlos (`archivos.drive_file_id` es único).
- Carpetas raíz permitidas configurables (`DRIVE_ROOT_FOLDER_IDS`), para no recorrer todo el Drive.

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

No hay registro público.

### Reglas de visibilidad

Implementadas en **una única función** del servidor (por ejemplo `documentVisibilityFilter(user)`), usada por la búsqueda, la navegación, la ficha y `/api/archivos/[id]`:

| Rol | Ve |
|---|---|
| admin | Todo, incluidos borradores |
| fabrica | `estado IN ('vigente', 'obsoleto')` |
| concesionario | `estado IN ('vigente', 'obsoleto')` **y** `visibilidad = 'concesionarios'` |

Además, nadie fuera del admin ve documentos asociados únicamente a máquinas de un segmento o línea desactivados (por ejemplo, fertilizadoras mientras estén ocultas).

## Búsqueda

Toda la búsqueda se resuelve en Postgres, sin servicios externos.

### Configuración

- Configuración de texto propia, por ejemplo `es_unaccent`, basada en `spanish` con `unaccent` para que "regulacion" encuentre "regulación".
- Columna `documentos.busqueda` (`tsvector`) con pesos:
  - **A:** título
  - **B:** etiquetas, nombres de máquinas (línea y modelo), tipo, sistemas, temas
  - **C:** descripción
  - **D:** texto extraído de los archivos
- Índice GIN sobre `busqueda`.
- Índice trigram (`pg_trgm`) sobre título y etiquetas para tolerar errores de tipeo ("dosificadr").

### Actualización del índice

`busqueda` depende de varias tablas, así que no puede ser una columna generada. Se recalcula con una función `rebuildDocumentSearch(documentoId)` llamada al:

- guardar o publicar un documento,
- cambiar sus etiquetas, máquinas, sistemas o temas,
- terminar la extracción de texto de uno de sus archivos,
- renombrar una entrada de taxonomía (recalcular los documentos afectados).

### Consulta

1. Se arma la consulta con `websearch_to_tsquery('es_unaccent', q)` (soporta comillas y `-excluir`).
2. Si hay pocos resultados, se complementa con coincidencias por similitud trigram sobre título y etiquetas.
3. Se aplican los filtros (máquina, tipo, sistema, tema, etiqueta) y el filtro de visibilidad.
4. Orden: `ts_rank_cd` → documentos `vigente` antes que `obsoleto` → documentos específicos (un solo sistema/tema, asociados a modelo) antes que generales → más recientes.
5. Se devuelve un fragmento resaltado con `ts_headline` sobre título/descripción.
6. Si no hay resultados, se registra en `busquedas` con `cantidad_resultados = 0`.

### Filtro por máquina

Filtrar por un **modelo** devuelve los documentos asociados a ese modelo **y** los asociados a su línea completa. Filtrar por una **línea** devuelve los de la línea y los de cualquiera de sus modelos.

## Extracción de texto

- Proceso separado (worker) para no bloquear las requests: cola simple en Postgres (`archivos.estado_extraccion = 'pendiente'`) consumida por un proceso Node.
- PDFs con texto: `pdftotext` (poppler) o `pdfjs`.
- PDFs escaneados (poco o ningún texto extraído): OCR con Tesseract en español (`tesseract-ocr-spa`) sobre las páginas rasterizadas. Es lento; procesar de a uno.
- Google Docs nativos: exportar como texto plano con `files.export`.
- Videos e imágenes: sin extracción (se buscan por título, descripción y etiquetas).
- Guardar el texto en `archivos.texto_extraido` y al terminar llamar a `rebuildDocumentSearch`.
- Límite razonable de texto por archivo (por ejemplo, 1 MB) para no inflar el índice.

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
```
