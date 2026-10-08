# 01 · Producto

## Problema

La documentación técnica de Crucianelli está en Google Drive, repartida en miles de carpetas y subcarpetas. Encontrar algo depende de saber dónde se guardó. No hay una vista centralizada por máquina, ni una forma clara de saber qué documento está vigente.

## Objetivo

Que un mecánico de concesionario o un técnico de fábrica encuentre lo que necesita en segundos, buscando por texto, máquina, tipo de documento, sistema, tema o etiquetas.

La biblioteca **no reemplaza a Drive**: es una capa de organización, clasificación, búsqueda y acceso por encima de él.

## Usuarios

El proyecto está pensado principalmente para los concesionarios (unas 70 concesionarias), aunque también lo usa el personal de fábrica. Ambos ingresan desde el día uno. Los **clientes finales** (productores que usan las máquinas) también consultan la documentación que se marca para ellos.

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **admin** | Responsable de la biblioteca | Todo: usuarios, concesionarios, máquinas, taxonomía, carga y publicación de documentos, registros |
| **fabrica** | Personal de Crucianelli | Ver y descargar toda la documentación publicada, incluida la de visibilidad "Solo fábrica" (planos, etc.) |
| **concesionario** | Mecánico de un concesionario | Ver y descargar solo la documentación publicada marcada para concesionarios |
| **cliente final** | Cliente que usa la máquina | Ver y descargar solo la documentación publicada marcada para clientes. **Por ahora sin cuenta**: entra libre, sin login |

- **Un documento puede ser para varios públicos:** se marca para concesionarios, para clientes, para ambos o para ninguno ("Solo fábrica"). Fábrica ve siempre todo.
- **Un usuario por persona.** Los usuarios de concesionario pertenecen a un concesionario. No hay usuarios compartidos.
- **Sin registro público.** El admin crea los usuarios (fábrica y concesionarios) y el sistema les envía una invitación por mail para que definan su contraseña. Los clientes finales no tienen cuenta "en primera instancia"; si más adelante se les pide cuenta, el rol `cliente` ya existe como lector en la función de visibilidad.
- **Pausa por inactividad:** una cuenta de fábrica o de concesionario que no usa la app durante un tiempo (`INACTIVIDAD_DIAS`, 90 por defecto) queda pausada y no puede ingresar hasta que el admin la vuelva a habilitar. No aplica al admin.

## Contexto de uso

- **Principalmente desde el celular, en el campo**, al lado de la máquina y a veces con mala señal → mobile-first y liviano.
- También desde la computadora (oficina, taller) → el diseño de escritorio tiene que ser cuidado.

## Alcance del MVP

**Incluido**

- Login, invitaciones por mail, recuperación de contraseña
- Roles admin / fabrica / concesionario y gestión de concesionarios; clientes finales con acceso libre a lo marcado para ellos
- Pausa de cuentas por inactividad y rehabilitación desde el admin
- Buscador por texto (incluye el contenido de los PDFs), con corrección de errores de tipeo, páginas del PDF donde aparece lo buscado y búsquedas recientes del usuario
- Filtros por producto (Sembradoras, Fertilizadoras, Tecnología, Accesorios siembra), máquina, tipo, sistema, tema y etiquetas
- Navegación por máquina: segmento → línea → modelo
- Ficha de documento, visor y descarga
- Videos embebidos desde Drive
- Panel de admin: explorador de Drive para seleccionar archivos, clasificación, publicación y versiones
- Administración de máquinas y taxonomía
- Registro de accesos a documentos y de búsquedas (sin resultados, más frecuentes y documentos más consultados, ordenables A→Z / Z→A)

**Fuera del MVP**

- IA para el usuario final (chat, asistente, búsqueda semántica)
- Recomendaciones automáticas
- Analítica avanzada
- Que un concesionario gestione sus propios mecánicos
- Uso sin conexión (PWA offline)
- Fertilizadoras como máquinas (segmento Fertilización): la estructura las contempla, pero quedan ocultas hasta una etapa posterior. El producto "Fertilizadoras" existe para clasificar y filtrar; sus documentos asociados a máquinas ocultas siguen ocultos

## Piloto

Arrancar con una sola línea de sembradoras clasificada de punta a punta y probarla con 3 o 4 técnicos reales antes de escalar al resto.

## Evolución prevista (no implementar ahora)

1. Búsqueda semántica y documentos relacionados
2. Asistente técnico con respuestas citando fuentes
3. Sugerencia de metadatos con IA al cargar documentos (uso interno del admin)
4. Uso sin conexión para el campo
