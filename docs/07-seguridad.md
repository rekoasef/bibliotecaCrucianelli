# 07 · Revisión de seguridad (fase 5)

Revisión del código antes del piloto, centrada en las reglas de `CLAUDE.md`. Fecha: 2026-10-05.

## Qué se verificó

| Punto | Cómo | Resultado |
|---|---|---|
| Visibilidad centralizada | Todas las consultas para usuarios (`src/lib/documentos/queries.ts`, `src/lib/search/*`) usan `documentVisibilityFilter`. Tests por rol contra Postgres. | OK |
| `/api/archivos/[id]` | Sesión → `getArchivoVisible` (misma función) → streaming. Sin permiso responde 404 igual que si no existiera. e2e: el mecánico recibe 404 en documentos y archivos "Solo fábrica". | OK |
| `drive_file_id` al cliente | Los archivos viajan como `ArchivoPublico` (ID de Drive solo si es de modo público). e2e: el HTML de la ficha y de las pantallas de edición del admin no contiene IDs de Drive de archivos privados. | Corregido (ver abajo) |
| Server Actions | Script que revisa que cada acción exportada empiece con `requireUser()` / `requireAdmin()`. Las únicas sin chequeo son las de login, logout y recuperación (públicas por diseño). | OK |
| Páginas del admin | Todas llaman a `requireAdmin()` además del layout. e2e: un mecánico recibe 404 en las 11 rutas de `/admin`. | Corregido (ver abajo) |
| Endpoints de auth | No se monta `/api/auth/*` (no hay registro alcanzable). Login y recuperación con rate limiting propio en Postgres (por email y por IP). | OK |
| Enumeración de usuarios | Login: mismo mensaje para email inexistente y contraseña mala. Recuperación: mismo mensaje exista o no el email (y los errores de mail no se muestran). | OK |
| Tokens | Invitación y recuperación de un solo uso, con vencimiento, guardados hasheados. | OK |
| Sesión | Cookie `__Secure-…`, `HttpOnly`, `Secure`, `SameSite=Lax` (verificado detrás de Caddy). Se invalida al desactivar usuario o concesionario y en cada request se revisa que sigan activos. | OK |
| Redirecciones | `?next=` solo acepta rutas internas (`safeRedirectPath`, con tests). | OK |
| XSS | Sin `dangerouslySetInnerHTML`. El resaltado de búsqueda usa marcadores de control, no HTML. Archivos HTML/SVG de Drive se fuerzan a descarga + `nosniff`. | OK |
| SQL | Todo con parámetros (Drizzle / `sql\`\``); sin `sql.raw`. | OK |
| Explorador de Drive | Solo dentro de `DRIVE_ROOT_FOLDER_IDS` (se recorren los padres); e2e intenta `../` en Drive local. | OK |
| IP para rate limiting | Caddy reemplaza `X-Forwarded-For` (un valor enviado por el cliente no cuenta). | OK |
| Cabeceras | CSP (`frame-ancestors 'none'`, `frame-src` solo Drive, `object-src 'none'`, `base-uri`/`form-action 'self'`), HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; sin `X-Powered-By`. | OK |
| Secretos | Solo en `.env` / `.env.production` (ignorados por git). El build de Docker no necesita secretos. | OK |

## Corregido en esta revisión

1. **La pantalla de edición de documentos mandaba al navegador los archivos completos** (incluido `drive_file_id` y el texto extraído, que puede pesar hasta 1 MB por archivo) porque el formulario cliente recibía el objeto entero. Ahora recibe solo los campos que usa. Lo mismo en la edición de líneas (ID de Drive de la foto).
2. **Páginas del admin protegidas solo por el layout.** En el App Router el layout y la página se renderizan en paralelo, así que cada página ahora llama a `requireAdmin()` antes de consultar datos.

## Riesgos aceptados / pendientes

- **Archivos con link público (decisión del 2026-10-05, sin Google Cloud):** los archivos en Drive quedan con acceso "Cualquier persona con el vínculo". La app no muestra ese link (los sirve ella con permisos), pero quien lo consiga por fuera (desde Drive, o porque alguien lo reenvía) puede abrir el archivo sin usuario. Aceptado porque la mayoría del material ya es público; lo sensible va como "Solo fábrica". Si un plano no debe quedar accesible por link, no cargarlo hasta tener otra forma de acceso (cuenta de servicio o subida a la app).
- **Límites de Google para descargas públicas:** si un archivo se descarga muchas veces, Google puede responder temporalmente "demasiadas descargas" y la app lo muestra como no disponible. Con el volumen del piloto no se espera; si pasa, se puede agregar un caché de archivos en el servidor.

- **Videos con link público:** cualquiera que tenga el link de Drive puede verlo (así funciona hoy en la empresa). La app solo lo muestra a quien tiene permiso sobre el documento y avisa si está en un documento "Solo fábrica".
- **El admin ve IDs de Drive** en el explorador (los necesita para incorporar). Es el único rol que los ve.
- **CSP sin restricción de scripts:** restringir `script-src` en Next requiere nonces por request; se puede evaluar después del piloto.
- **Backups fuera de la VPS:** depende de configurar `BACKUP_COPY_CMD` (ver `deploy/README.md`). Conviene que la copia externa esté cifrada (los backups incluyen el texto extraído de los documentos y los datos de los usuarios).
- **Probar la restauración en la VPS real** antes de producción (en desarrollo ya se probó).
