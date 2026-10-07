-- Índice por página de los PDFs (docs/02-arquitectura.md, "Páginas").
-- `texto_extraido` separa las páginas con \f (el worker los conserva desde esta
-- versión); esta función parte el texto y guarda un tsvector por página.
-- Las páginas vacías no se guardan, pero conservan su número.
CREATE OR REPLACE FUNCTION rebuild_archivo_paginas(arch_id uuid) RETURNS void
LANGUAGE sql AS $$
  DELETE FROM archivo_paginas WHERE archivo_id = arch_id;
  INSERT INTO archivo_paginas (archivo_id, pagina, busqueda)
    SELECT a.id, p.n, to_tsvector('es_unaccent', p.texto)
    FROM archivos a,
      unnest(string_to_array(a.texto_extraido, E'\f')) WITH ORDINALITY AS p(texto, n)
    WHERE a.id = arch_id AND a.mime_type = 'application/pdf'
      AND p.texto ~ '\S';
$$;
--> statement-breakpoint

-- El texto de los PDFs ya extraídos no tiene los saltos de página:
-- vuelven a la cola del worker.
UPDATE archivos SET estado_extraccion = 'pendiente', actualizado_en = now()
WHERE mime_type = 'application/pdf' AND estado_extraccion IN ('ok', 'sin_texto');
