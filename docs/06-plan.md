# 06 · Plan de implementación

Trabajar fase por fase. Cada fase termina con algo que funciona y se puede probar. Marcar cada ítem al completarlo.

## Antes de empezar (tareas fuera del código)

- [ ] Crear la cuenta de servicio de Google con Drive API y compartirle las carpetas raíz de documentación
- [ ] Obtener los IDs de las carpetas raíz
- [ ] Datos del SMTP de la empresa
- [ ] Acceso a la VPS y dominio o subdominio para la app
- [ ] Confirmar el ancho de banda de la VPS
- [ ] Logo y colores oficiales de Crucianelli
- [ ] Lista de modelos por línea (al menos de la línea piloto)
- [ ] Elegir la línea piloto

## Fase 0 · Base del proyecto

- [x] Confirmar las elecciones *propuesta* de `02-arquitectura.md` (ORM, auth, UI)
- [x] Crear el proyecto Next.js + TypeScript + Tailwind + shadcn/ui
- [x] Docker Compose de desarrollo con Postgres
- [x] ORM y primera migración: extensiones y configuración de búsqueda `es_unaccent`
- [x] `.env.example`
- [x] Lint, formato y scripts; completar la sección "Comandos" de `CLAUDE.md`
- [x] Layout base mobile-first con la marca

## Fase 1 · Usuarios y acceso

- [x] Migraciones: `concesionarios`, `usuarios` y tablas de la librería de auth
- [x] Login, logout, sesión
- [x] Envío de mails por SMTP
- [x] Invitación por mail y definición de contraseña
- [x] Recuperación de contraseña
- [x] Middleware de rutas: `/admin` solo admin; el resto requiere sesión
- [x] Bloqueo de usuarios y concesionarios inactivos
- [x] Admin: CRUD de concesionarios y usuarios
- [x] Seed: admin inicial desde `ADMIN_EMAIL`
- [x] Rate limiting en login

## Fase 2 · Máquinas y taxonomía

- [x] Migraciones: `segmentos`, `lineas`, `modelos`, `tipos`, `sistemas`, `temas`, `etiquetas`
- [x] Seed según `04-taxonomia.md`
- [x] Admin: árbol de máquinas
- [x] Admin: taxonomía (incluida la fusión de etiquetas)

## Fase 3 · Documentos y Drive

- [x] Migraciones: `documentos`, `archivos` y tablas de relación
- [x] Cliente de Drive con cuenta de servicio (listar carpetas, metadatos, descarga en streaming)
- [ ] Probar el cliente con la cuenta de servicio real (hasta ahora se probó con `DRIVE_LOCAL_DIR`)
- [x] Admin: explorador de Drive y creación de borradores
- [x] Admin: edición y clasificación de documentos
- [x] Validación y publicación
- [x] **Función central de visibilidad** (`documentVisibilityFilter`) con tests por rol
- [x] `/api/archivos/[id]`: permisos, streaming, `Range`, inline/descarga, registro en `accesos`
- [x] Videos embebidos con botón "Abrir en Drive"
- [x] Advertencia de video público en documento "Solo fábrica"
- [x] Nueva versión y obsoletos
- [x] Foto opcional de la línea elegida desde Drive (`lineas.imagen_drive_file_id`; quedó pendiente de la fase 2 porque necesita el cliente de Drive)
- [x] Fusión y borrado de etiquetas: mover/limpiar `documento_etiquetas` (TODO en `admin/taxonomia/actions.ts`)

## Fase 4 · Búsqueda y navegación

- [x] `rebuildDocumentSearch` y sus disparadores
- [x] Worker de extracción de texto (PDF con texto)
- [x] OCR para PDFs escaneados
- [x] Consulta de búsqueda con filtros, ranking, resaltado y tolerancia a errores de tipeo
- [x] Filtro por máquina en dos niveles (línea ↔ modelo)
- [x] Registro de búsquedas
- [x] Pantallas: inicio, resultados, navegación por máquina, ficha
- [x] Tests de búsqueda con casos reales ("regulacion dosificador", "sensr", "gringa v despiece")
- [x] Corrección de errores de tipeo con el vocabulario de la biblioteca ("dosificacin" → "dosificacion")
- [x] Páginas del PDF donde aparece lo buscado
- [x] Búsquedas recientes del usuario en el inicio y en `/buscar`

## Fase 5 · Operación y piloto

- [x] Detección de cambios en Drive (tarea nocturna)
- [x] Panel de admin con pendientes y búsquedas sin resultados
- [x] Pantalla de registros
- [x] Docker Compose de producción, proxy con HTTPS
- [x] Backups automáticos de Postgres y prueba de restauración (probada en desarrollo)
- [ ] Configurar la copia de backups fuera de la VPS (`BACKUP_COPY_CMD`) y repetir la prueba de restauración en la VPS real
- [x] Revisión de seguridad: ninguna ruta devuelve datos o `drive_file_id` sin pasar por la función de visibilidad (ver `07-seguridad.md`)
- [ ] Primer despliegue en la VPS (`deploy/README.md`)
- [ ] Pruebas en celulares reales con señal mala
- [ ] Carga completa de la línea piloto
- [ ] Prueba con 3 o 4 técnicos reales y ajustes

## Después del piloto

- Cargar el resto de las líneas de sembradoras
- Ajustar la taxonomía según el uso y las búsquedas sin resultados
- Fertilizadoras
- Evaluar: gestión de mecánicos por el propio concesionario, uso sin conexión, búsqueda semántica
