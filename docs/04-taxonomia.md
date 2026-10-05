# 04 · Taxonomía

Todas las listas de este documento son **administrables desde el panel** (`/admin/maquinas` y `/admin/taxonomia`) y se cargan como seed inicial (`npm run db:seed`, idempotente: solo agrega lo que falta). Son un punto de partida: la clasificación definitiva se ajusta durante el relevamiento de la documentación real, evitando crear categorías que no se usen.

## Máquinas

Jerarquía de tres niveles: **Segmento → Línea → Modelo**. El mecánico identifica su máquina por modelo (por ejemplo, "Gringa V"); no se usa número de serie ni año.

### Segmentos y líneas

| Segmento | Activo | Líneas |
|---|---|---|
| Granos gruesos | Sí | Gringa, Plantor, Domina |
| Granos finos | Sí | Pionera, Drilor, Mixia |
| Fertilización | **No** (fase posterior) | Fertec, Raster *(a confirmar)* |

> Pendiente de confirmar con posventa: si Mixia se maneja como línea propia o como modelo dentro de Drilor. Por ahora se carga como línea.

### Modelos

Se completan durante el relevamiento. Ejemplos conocidos:

| Línea | Modelos |
|---|---|
| Gringa | Gringa V, Gringa Nueva |
| Plantor | *(completar)* |
| Domina | *(completar)* |
| Pionera | *(completar)* |
| Drilor | *(completar)* |
| Mixia | *(completar)* |

Si para una línea todavía no hay modelos cargados, los documentos se asocian a la línea completa.

### Reglas

- Un documento puede asociarse a varias líneas y/o modelos sin duplicar el archivo.
- Asociar a una **línea** = aplica a todos sus modelos.
- Asociar a un **modelo** = aplica solo a ese modelo.
- Un segmento, línea o modelo inactivo no aparece para usuarios no admin, junto con los documentos asociados únicamente a máquinas inactivas.

## Tipos de documento

Uno por documento (obligatorio para publicar).

- Manual
- Instructivo
- Procedimiento
- Video
- Plano
- Despiece
- Ficha técnica
- Boletín técnico
- Solución de problemas

## Sistemas / áreas

Cero, uno o varios por documento. Lo habitual es uno; un documento general puede tener varios o ninguno.

- Dosificación
- Hidráulica
- Eléctrica
- Electrónica
- Mantenimiento
- Chasis y estructura *(a confirmar)*
- Tren de siembra *(a confirmar)*

## Temas

Cero, uno o varios por documento.

- Regulación
- Calibración
- Diagnóstico
- Instalación
- Reparación
- Puesta en marcha *(a confirmar)*

## Etiquetas

Texto libre con autocompletado. Sirven para términos técnicos que ayuden a encontrar el documento y que no encajan en las listas anteriores: *dosificador, sensor, semillas, placas, monitor, cardán, rodamiento…*

- Se normalizan (minúsculas, sin acentos, espacios simples) para evitar duplicados.
- No repetir como etiqueta algo que ya es tipo, sistema, tema o máquina: el panel lo rechaza.
- Duplicadas con distinta forma ("dosificador" / "dosificadores"): se unen con "Fusionar en…".

## Slugs

Segmentos, líneas, modelos, tipos, sistemas y temas tienen un `slug` único que se usa en URLs y filtros (`/maquinas/gringa`, `/buscar?tipo=manual`). Se genera del nombre al crear y **no cambia al renombrar**, para no romper links compartidos; el admin puede editarlo a mano si hace falta.

## Visibilidad

| Valor | Quién lo ve |
|---|---|
| Concesionarios *(default)* | Fábrica y concesionarios |
| Solo fábrica | Solo fábrica (y admin) |

Los planos y documentación sensible van como "Solo fábrica".

## Estados

| Estado | Significado | Visible para |
|---|---|---|
| Borrador | Incorporado desde Drive, sin clasificar o sin publicar | Solo admin |
| Vigente | Publicado y actual | Según visibilidad |
| Obsoleto | Reemplazado por una versión nueva | Según visibilidad, con aviso y link a la vigente |

No hay estado "En revisión": el admin publica directamente.
