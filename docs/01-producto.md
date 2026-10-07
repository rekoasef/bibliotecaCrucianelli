# 01 · Producto

## Problema

La documentación técnica de Crucianelli está en Google Drive, repartida en miles de carpetas y subcarpetas. Encontrar algo depende de saber dónde se guardó. No hay una vista centralizada por máquina, ni una forma clara de saber qué documento está vigente.

## Objetivo

Que un mecánico de concesionario o un técnico de fábrica encuentre lo que necesita en segundos, buscando por texto, máquina, tipo de documento, sistema, tema o etiquetas.

La biblioteca **no reemplaza a Drive**: es una capa de organización, clasificación, búsqueda y acceso por encima de él.

## Usuarios

El proyecto está pensado principalmente para los concesionarios (unas 70 concesionarias), aunque también lo usa el personal de fábrica. Ambos ingresan desde el día uno.

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **admin** | Responsable de la biblioteca | Todo: usuarios, concesionarios, máquinas, taxonomía, carga y publicación de documentos, registros |
| **fabrica** | Personal de Crucianelli | Ver y descargar toda la documentación publicada, incluida la de visibilidad "Solo fábrica" (planos, etc.) |
| **concesionario** | Mecánico de un concesionario | Ver y descargar solo la documentación publicada con visibilidad "Concesionarios" |

- **Un usuario por persona.** Los usuarios de concesionario pertenecen a un concesionario. No hay usuarios compartidos.
- **Sin registro público.** El admin crea los usuarios y el sistema les envía una invitación por mail para que definan su contraseña.

## Contexto de uso

- **Principalmente desde el celular, en el campo**, al lado de la máquina y a veces con mala señal → mobile-first y liviano.
- También desde la computadora (oficina, taller) → el diseño de escritorio tiene que ser cuidado.

## Alcance del MVP

**Incluido**

- Login, invitaciones por mail, recuperación de contraseña
- Roles admin / fabrica / concesionario y gestión de concesionarios
- Buscador por texto (incluye el contenido de los PDFs), con corrección de errores de tipeo, páginas del PDF donde aparece lo buscado y búsquedas recientes del usuario
- Filtros por máquina, tipo, sistema, tema y etiquetas
- Navegación por máquina: segmento → línea → modelo
- Ficha de documento, visor y descarga
- Videos embebidos desde Drive
- Panel de admin: explorador de Drive para seleccionar archivos, clasificación, publicación y versiones
- Administración de máquinas y taxonomía
- Registro de accesos a documentos y de búsquedas sin resultados

**Fuera del MVP**

- IA para el usuario final (chat, asistente, búsqueda semántica)
- Recomendaciones automáticas
- Analítica avanzada
- Que un concesionario gestione sus propios mecánicos
- Uso sin conexión (PWA offline)
- Fertilizadoras: la estructura las contempla, pero quedan ocultas hasta una etapa posterior

## Piloto

Arrancar con una sola línea de sembradoras clasificada de punta a punta y probarla con 3 o 4 técnicos reales antes de escalar al resto.

## Evolución prevista (no implementar ahora)

1. Búsqueda semántica y documentos relacionados
2. Asistente técnico con respuestas citando fuentes
3. Sugerencia de metadatos con IA al cargar documentos (uso interno del admin)
4. Uso sin conexión para el campo
