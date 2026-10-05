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

- [ ] Migraciones: `concesionarios`, `usuarios` y tablas de la librería de auth
- [ ] Login, logout, sesión
- [ ] Envío de mails por SMTP
- [ ] Invitación por mail y definición de contraseña
- [ ] Recuperación de contraseña
- [ ] Middleware de rutas: `/admin` solo admin; el resto requiere sesión
- [ ] Bloqueo de usuarios y concesionarios inactivos
- [ ] Admin: CRUD de concesionarios y usuarios
- [ ] Seed: admin inicial desde `ADMIN_EMAIL`
- [ ] Rate limiting en login

## Fase 2 · Máquinas y taxonomía

- [ ] Migraciones: `segmentos`, `lineas`, `modelos`, `tipos`, `sistemas`, `temas`, `etiquetas`
- [ ] Seed según `04-taxonomia.md`
- [ ] Admin: árbol de máquinas
- [ ] Admin: taxonomía (incluida la fusión de etiquetas)

## Fase 3 · Documentos y Drive

- [ ] Migraciones: `documentos`, `archivos` y tablas de relación
- [ ] Cliente de Drive con cuenta de servicio (listar carpetas, metadatos, descarga en streaming)
- [ ] Admin: explorador de Drive y creación de borradores
- [ ] Admin: edición y clasificación de documentos
- [ ] Validación y publicación
- [ ] **Función central de visibilidad** (`documentVisibilityFilter`) con tests por rol
- [ ] `/api/archivos/[id]`: permisos, streaming, `Range`, inline/descarga, registro en `accesos`
- [ ] Videos embebidos con botón "Abrir en Drive"
- [ ] Advertencia de video público en documento "Solo fábrica"
- [ ] Nueva versión y obsoletos

## Fase 4 · Búsqueda y navegación

- [ ] `rebuildDocumentSearch` y sus disparadores
- [ ] Worker de extracción de texto (PDF con texto)
- [ ] OCR para PDFs escaneados
- [ ] Consulta de búsqueda con filtros, ranking, resaltado y tolerancia a errores de tipeo
- [ ] Filtro por máquina en dos niveles (línea ↔ modelo)
- [ ] Registro de búsquedas
- [ ] Pantallas: inicio, resultados, navegación por máquina, ficha
- [ ] Tests de búsqueda con casos reales ("regulacion dosificador", "sensr", "gringa v despiece")

## Fase 5 · Operación y piloto

- [ ] Detección de cambios en Drive (tarea nocturna)
- [ ] Panel de admin con pendientes y búsquedas sin resultados
- [ ] Pantalla de registros
- [ ] Docker Compose de producción, proxy con HTTPS
- [ ] Backups automáticos de Postgres y prueba de restauración
- [ ] Revisión de seguridad: ninguna ruta devuelve datos o `drive_file_id` sin pasar por la función de visibilidad
- [ ] Pruebas en celulares reales con señal mala
- [ ] Carga completa de la línea piloto
- [ ] Prueba con 3 o 4 técnicos reales y ajustes

## Después del piloto

- Cargar el resto de las líneas de sembradoras
- Ajustar la taxonomía según el uso y las búsquedas sin resultados
- Fertilizadoras
- Evaluar: gestión de mecánicos por el propio concesionario, uso sin conexión, búsqueda semántica
