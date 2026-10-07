# 03 · Modelo de datos

PostgreSQL. Nombres de tablas y columnas en español, sin acentos, en `snake_case`. Todas las claves primarias son `uuid` (`gen_random_uuid()`) salvo que se indique lo contrario. Todas las tablas principales tienen `creado_en` y `actualizado_en` (`timestamptz`).

## Diagrama

```
segmentos 1─N lineas 1─N modelos
                 │           │
                 N           N
          documento_lineas  documento_modelos
                 N           N
                 └──── documentos ────┐
                         │  │  │      │
       tipos 1─N ────────┘  │  │      └─ reemplazado_por_id → documentos
                            │  │
   documento_sistemas N─────┘  └─────N documento_temas
          N                               N
       sistemas                          temas

   documentos 1─N archivos
   documentos N─M etiquetas (documento_etiquetas)

concesionarios 1─N usuarios
usuarios 1─N accesos N─1 documentos
usuarios 1─N busquedas
```

## Tipos enumerados

```sql
CREATE TYPE rol_usuario       AS ENUM ('admin', 'fabrica', 'concesionario');
CREATE TYPE visibilidad_doc   AS ENUM ('concesionarios', 'fabrica');
CREATE TYPE estado_doc        AS ENUM ('borrador', 'vigente', 'obsoleto');
CREATE TYPE modo_acceso       AS ENUM ('servidor', 'publico');
CREATE TYPE estado_extraccion AS ENUM ('pendiente', 'procesando', 'ok', 'sin_texto', 'error', 'no_aplica');
CREATE TYPE accion_acceso     AS ENUM ('ver', 'descargar', 'video');
```

## Máquinas

### `segmentos`
Granos gruesos, Granos finos, Fertilización.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | único |
| slug | text | único, para URLs |
| orden | int | orden de presentación |
| activo | boolean | `false` oculta el segmento y todo lo que cuelga de él a usuarios no admin |

### `lineas`
Gringa, Plantor, Domina, Pionera, Drilor, Mixia…

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| segmento_id | uuid FK → segmentos | |
| nombre | text | único dentro del segmento |
| slug | text | único |
| descripcion | text | opcional |
| imagen_drive_file_id | text | opcional, foto de la máquina para la navegación |
| orden | int | |
| activo | boolean | |

### `modelos`
Gringa V, Gringa Nueva…

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| linea_id | uuid FK → lineas | |
| nombre | text | único dentro de la línea |
| slug | text | único |
| descripcion | text | opcional (años de fabricación, variantes, etc.) |
| orden | int | |
| activo | boolean | |

## Usuarios

### `concesionarios`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | único |
| localidad | text | |
| provincia | text | |
| activo | boolean | desactivar bloquea el ingreso de todos sus usuarios |

### `usuarios`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| email | text | único, en minúsculas |
| rol | rol_usuario | |
| concesionario_id | uuid FK → concesionarios, null | |
| activo | boolean | |
| ultimo_ingreso | timestamptz | null |

```sql
CHECK ((rol = 'concesionario') = (concesionario_id IS NOT NULL))
```

Además, `email_verificado` (boolean) e `imagen` (text, null), que Better Auth exige en su tabla de usuario, y `CHECK (email = lower(email))`.

### Tablas de Better Auth

Better Auth usa `usuarios` como su tabla de usuario (mapeando sus campos a los nombres en español). Sus tablas propias usan nombres de columna en inglés, porque son internas de la librería:

| Tabla | Para qué |
|---|---|
| `sesiones` | Sesiones activas (`user_id`, `token`, `expires_at`, `ip_address`, `user_agent`) |
| `cuentas` | Credenciales: la contraseña hasheada (`provider_id = 'credential'`). Un usuario sin fila acá tiene la **invitación pendiente** |
| `verificaciones` | Tokens de invitación y de recuperación de contraseña, **guardados hasheados** |

No hay tabla de invitaciones: una invitación es un token de restablecimiento con vencimiento de 7 días (la recuperación de contraseña vence en 1 hora). Usarlo crea la credencial.

### `limites_tasa`

Contadores de ventana fija para el rate limiting de login, recuperación de contraseña y reenvío de invitaciones.

| Columna | Tipo | Notas |
|---|---|---|
| clave | text PK | por ejemplo `login:email:juan@taller.com`, `login:ip:1.2.3.4` |
| cantidad | int | intentos en la ventana actual |
| ventana_inicio | timestamptz | |

## Taxonomía

### `tipos`, `sistemas`, `temas`
Las tres con la misma estructura:

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | único |
| slug | text | único |
| orden | int | |
| activo | boolean | inactivo = no se ofrece al cargar, pero los documentos existentes lo conservan |

### `etiquetas`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | como se muestra |
| nombre_normalizado | text | único; minúsculas, sin acentos, espacios simples |

Las etiquetas se crean al vuelo desde el formulario de carga (con autocompletado sobre las existentes para evitar duplicados).

## Documentos

### `documentos`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| titulo | text | obligatorio para publicar |
| descripcion | text | opcional |
| tipo_id | uuid FK → tipos, null | obligatorio para publicar |
| visibilidad | visibilidad_doc | default `concesionarios` |
| estado | estado_doc | default `borrador` |
| reemplazado_por_id | uuid FK → documentos, null | solo cuando `estado = 'obsoleto'` |
| reemplaza_id | uuid FK → documentos, null | en un borrador creado con "Nueva versión": el documento que pasa a obsoleto al publicarlo |
| version | text | opcional, texto libre ("Rev. 3", "2025") |
| fecha_documento | date | opcional, fecha de la edición del documento |
| publicado_en | timestamptz | null hasta la primera publicación |
| requiere_revision | boolean | `true` si el archivo cambió en Drive y el admin debe revisarlo |
| creado_por | uuid FK → usuarios | |
| actualizado_por | uuid FK → usuarios | |
| busqueda | tsvector | ver `02-arquitectura.md` |

```sql
CHECK (reemplazado_por_id IS NULL OR estado = 'obsoleto')
CHECK (reemplazado_por_id <> id)
CHECK (estado = 'borrador' OR (titulo IS NOT NULL AND tipo_id IS NOT NULL))
```

Reglas para publicar (validadas en el servidor, además de los `CHECK`):

- título y tipo cargados,
- al menos un archivo,
- al menos una máquina (línea o modelo) asociada.

Sistemas, temas y etiquetas son opcionales (un manual general puede no tener).

### `archivos`

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | se usa en `/api/archivos/[id]` |
| documento_id | uuid FK → documentos ON DELETE CASCADE | |
| drive_file_id | text | **único**; nunca se envía al cliente si `modo_acceso = 'servidor'` |
| nombre | text | nombre del archivo en Drive |
| mime_type | text | |
| tamano_bytes | bigint | null para Google Docs nativos |
| drive_modificado_en | timestamptz | `modifiedTime` de Drive |
| modo_acceso | modo_acceso | default según mime: video → `publico`, resto → `servidor` |
| orden | int | orden dentro del documento |
| disponible | boolean | `false` si fue borrado en Drive o se perdió el acceso |
| texto_extraido | text | null |
| estado_extraccion | estado_extraccion | `no_aplica` para videos e imágenes |
| extraccion_error | text | null |

### Relaciones de documentos

| Tabla | Columnas | PK |
|---|---|---|
| `documento_lineas` | documento_id, linea_id | (documento_id, linea_id) |
| `documento_modelos` | documento_id, modelo_id | (documento_id, modelo_id) |
| `documento_sistemas` | documento_id, sistema_id | (documento_id, sistema_id) |
| `documento_temas` | documento_id, tema_id | (documento_id, tema_id) |
| `documento_etiquetas` | documento_id, etiqueta_id | (documento_id, etiqueta_id) |

Todas con `ON DELETE CASCADE` en ambos lados y un índice en la segunda columna (borrar una etiqueta la quita de los documentos; líneas, modelos, sistemas y temas no se borran, se desactivan).

**Máquinas en dos niveles:** un documento se asocia a líneas completas (aplica a todos sus modelos, presentes y futuros) y/o a modelos puntuales. No hace falta asociar un modelo si ya está asociada su línea.

## Versiones

- Las versiones conviven: el documento viejo no se borra.
- Flujo "Nueva versión" desde la ficha de admin:
  1. se crea un documento nuevo en `borrador` copiando título, tipo, visibilidad, máquinas, sistemas, temas y etiquetas, con `reemplaza_id` apuntando al vigente;
  2. el admin elige el archivo nuevo en Drive y ajusta lo que haga falta;
  3. al publicar el nuevo, en la misma transacción el anterior pasa a `obsoleto` con `reemplazado_por_id` apuntando al nuevo.
- Para mostrar el historial, se recorre la cadena de `reemplazado_por_id` (consulta recursiva).
- Los documentos obsoletos siguen siendo visibles y buscables, con un aviso y un link a la versión vigente, y aparecen después de los vigentes en los resultados.

## Registros

### `accesos`

| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| usuario_id | uuid FK → usuarios | |
| documento_id | uuid FK → documentos | |
| archivo_id | uuid FK → archivos, null | |
| accion | accion_acceso | |
| creado_en | timestamptz | |

Se registra al ver la ficha (`ver`), al abrir o descargar un archivo servido (`ver`/`descargar`) y al reproducir un video embebido (`video`, registrado desde el cliente).

### `busquedas`

| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| usuario_id | uuid FK → usuarios | |
| texto | text | null si fue solo navegación por filtros |
| filtros | jsonb | filtros aplicados |
| cantidad_resultados | int | |
| creado_en | timestamptz | |

### `vocabulario`

Palabras que aparecen en los documentos, para corregir errores de tipeo en la búsqueda (ver `02-arquitectura.md`, "Consulta"). La llena `rebuild_document_search`; solo crece.

| Columna | Tipo | Notas |
|---|---|---|
| palabra | text PK | sin acentos, en minúscula, sin raíz; solo letras, 4 a 30 caracteres |

## Índices

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;  -- levenshtein() para corregir errores de tipeo

-- Configuración de búsqueda en español sin acentos
CREATE TEXT SEARCH CONFIGURATION es_unaccent (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION es_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;

CREATE INDEX documentos_busqueda_idx  ON documentos USING gin (busqueda);
CREATE INDEX documentos_titulo_trgm   ON documentos USING gin (titulo gin_trgm_ops);
CREATE INDEX etiquetas_nombre_trgm    ON etiquetas  USING gin (nombre_normalizado gin_trgm_ops);
CREATE INDEX vocabulario_palabra_trgm ON vocabulario USING gin (palabra gin_trgm_ops);
CREATE INDEX documentos_estado_vis    ON documentos (estado, visibilidad);
CREATE INDEX archivos_documento_idx   ON archivos (documento_id);
CREATE INDEX archivos_extraccion_idx  ON archivos (estado_extraccion) WHERE estado_extraccion = 'pendiente';
CREATE INDEX accesos_documento_idx    ON accesos (documento_id, creado_en);
CREATE INDEX accesos_usuario_idx      ON accesos (usuario_id, creado_en);
CREATE INDEX busquedas_sin_result_idx ON busquedas (creado_en) WHERE cantidad_resultados = 0;
```

Para el índice trigram sin acentos sobre `titulo`, usar una función `immutable` que envuelva `unaccent(lower(...))` (`unaccent` por sí sola no es `immutable`).

## Seed inicial

- Segmentos: Granos gruesos, Granos finos (activos) y Fertilización (inactivo).
- Líneas y modelos: ver `04-taxonomia.md`.
- Tipos, sistemas y temas iniciales: ver `04-taxonomia.md`.
- Un usuario admin inicial, con email tomado de una variable de entorno (`ADMIN_EMAIL`) y que recibe la invitación al ejecutar el seed.
