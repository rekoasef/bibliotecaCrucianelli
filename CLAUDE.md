@AGENTS.md

# Biblioteca Técnica Crucianelli

Aplicación web para que mecánicos de concesionarios y personal de fábrica de Crucianelli (fabricante de sembradoras, Armstrong, Santa Fe) encuentren documentación técnica en segundos. Flujo central: **Buscar → Filtrar → Encontrar → Abrir**.

Los archivos viven en Google Drive (usado como depósito). La app tiene su propia base de datos con la organización, clasificación, permisos y búsqueda.

## Documentación del proyecto

Leer antes de empezar cualquier tarea:

- `docs/01-producto.md` — objetivo, usuarios, alcance del MVP y qué queda fuera
- `docs/02-arquitectura.md` — stack, Drive, acceso a archivos, auth, búsqueda, infraestructura
- `docs/03-modelo-de-datos.md` — tablas, campos, relaciones e índices
- `docs/04-taxonomia.md` — máquinas, tipos, sistemas, temas, estados
- `docs/05-pantallas.md` — pantallas y flujos de usuario y admin
- `docs/06-plan.md` — fases de implementación con checklist
- `docs/07-seguridad.md` — revisión de seguridad y riesgos aceptados
- `docs/08-google-drive-y-smtp.md` — cómo cargar archivos de Drive (links) y configurar el mail
- `deploy/README.md` — despliegue en la VPS, backups y restauración

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (extensiones `unaccent` y `pg_trgm`)
- Drizzle ORM (driver `postgres`)
- Better Auth
- Tailwind CSS v4 + shadcn/ui (base Radix, íconos Lucide)
- Google Drive con links públicos (sin Google Cloud; ver docs/02, "Google Drive")
- Deploy en VPS propia de la empresa con Docker Compose

## Reglas que no se rompen

1. **Permisos siempre en el servidor.** Ocultar algo en la UI no es seguridad. Toda consulta y todo acceso a archivos verifica rol y visibilidad del lado del servidor.
2. **Un usuario de rol `concesionario` solo ve documentos con `visibilidad = 'concesionarios'` y `estado <> 'borrador'`.** Centralizar este filtro en una sola función reutilizable; no reescribirlo en cada consulta.
3. **Nunca exponer al cliente el `drive_file_id` ni URLs de Drive de archivos con `modo_acceso = 'servidor'`.** Esos archivos se sirven únicamente por `/api/archivos/[id]`, que verifica permisos y hace streaming desde Drive.
4. **Los links públicos de Drive (videos) solo se renderizan dentro de la ficha, para usuarios que tienen permiso de ver ese documento.**
5. **Mobile-first.** Los mecánicos usan la app desde el celular en el campo, a veces con mala señal. Páginas livianas, objetivos táctiles grandes, nada que dependa de hover. En escritorio también tiene que verse bien.
6. **No agregar funcionalidades fuera del alcance del MVP** (IA, chat, recomendaciones, analítica avanzada) aunque parezcan fáciles. Ver `docs/01-producto.md`.
7. **Nada entra a la biblioteca automáticamente.** El admin elige qué archivos de Drive se incorporan.

## Convenciones

- Interfaz en español (Argentina).
- Tablas, columnas y conceptos del dominio en español, tal como están en `docs/03-modelo-de-datos.md` (documento, linea, modelo, concesionario…). El resto del código (helpers, utilidades, componentes genéricos) en inglés.
- Migraciones versionadas; nunca modificar la base a mano.
- Secretos solo en variables de entorno (`.env`, nunca commiteado). Mantener `.env.example` actualizado.

## Forma de trabajo

- Trabajar por fases según `docs/06-plan.md`. Al terminar una fase, marcar su checklist.
- Si una decisión de los documentos resulta inviable o hay una mejor alternativa, plantearla antes de cambiarla y actualizar el documento correspondiente.

## Comandos

Producción: `docker-compose.prod.yml` (ver `deploy/README.md`).

Primera vez: `cp .env.example .env` (completar `BETTER_AUTH_SECRET` y `ADMIN_EMAIL`), `npm install`, `npm run db:up`, `npm run db:migrate`, `npm run db:seed`.

Sin SMTP configurado, en desarrollo los mails (invitaciones, recuperación) se imprimen en la consola del servidor.

Drive: por defecto la app usa **links públicos** (no hace falta configurar nada). `DRIVE_LOCAL_DIR` cambia a una carpeta local que simula Drive con explorador (desarrollo y pruebas).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas de Next y corre `tsc` |
| `npm run format` / `format:check` | Prettier (ordena clases de Tailwind) |
| `npm test` | Vitest (`src/**/*.test.ts`) |
| `npm run db:up` | Levanta Postgres 16 en Docker (puerto **5433** del host) |
| `npm run db:generate` | Genera una migración a partir de `src/db/schema` |
| `npm run db:migrate` | Aplica las migraciones de `src/db/migrations` |
| `npm run db:studio` | Drizzle Studio |
| `npm run worker:up` | Levanta el worker de extracción de texto en Docker (pdftotext + OCR) contra la base de desarrollo |
| `npm run sync:drive` | Corre una vez la detección de cambios en Drive (el worker la hace cada noche) |
| `npm run worker` | Corre el worker en el host (necesita `pdftotext`, `pdftoppm`, `pdfinfo` y `tesseract` con español) |
| `npm run db:seed` | Admin de `ADMIN_EMAIL` (con invitación), máquinas y taxonomía de `docs/04`. Idempotente |

Migraciones con SQL propio (extensiones, funciones, índices especiales): `npx drizzle-kit generate --custom --name=<nombre>`.

## Auth y permisos

- Páginas y **cada Server Action** empiezan con `requireUser()` o `requireAdmin()` (`src/lib/auth/session.ts`). Proteger un layout no protege las acciones.
- Índice de búsqueda: después de cambiar algo que lo compone (título, descripción, tipo, máquinas, sistemas, temas, etiquetas, archivos o su texto, nombres de taxonomía) llamar a `rebuildDocumentSearch` / `rebuildSearchForTaxonomia`.
- Visibilidad de documentos: **solo** con `documentVisibilityFilter` (`src/lib/documentos/visibility.ts`). Las consultas para usuarios están en `src/lib/documentos/queries.ts`; los archivos se mandan al cliente como `ArchivoPublico` (sin `drive_file_id` salvo modo público).
- No se monta `/api/auth`: usar `auth.api.*` desde el servidor.
- Páginas del admin: `requireAdmin()` en cada página, no solo en el layout (se renderizan en paralelo).
- A componentes cliente pasarles solo los campos que usan (nunca el objeto entero de la base: puede traer `drive_file_id` o texto extraído). Ver `docs/02-arquitectura.md` (Implementación fase 1).
- `.npmrc` tiene `legacy-peer-deps=true` por los peers opcionales de Better Auth.

## Diseño

- Tokens de color en `src/app/globals.css` (`:root`). Usar los tokens (`bg-primary`, `text-brand-strong`, `text-muted-foreground`…), nunca hex sueltos en componentes.
- `brand` (#E30613) solo como relleno de botones y acentos; para **texto** rojo sobre fondo claro usar `brand-strong` (contraste 6.4:1).
- Texto secundario: `muted-foreground` (#52525B, 7:1). No usar grises más claros para texto.
- Tipografía Atkinson Hyperlegible Next, base 16 px. Solo tema claro en el MVP.
- Objetivos táctiles de 44 px como mínimo: el `Button` de shadcn ya está ajustado (`default` = h-11).
- Navegación: barra inferior en celular (`BottomNav`), links en el header desde `md`.
