-- Índice de búsqueda de un documento (docs/02-arquitectura.md, "Búsqueda").
-- `busqueda` depende de varias tablas, así que no puede ser una columna generada:
-- la app llama a esta función cuando cambia algo de lo que la compone.
--
-- Pesos:
--   A  título
--   B  etiquetas, máquinas (líneas y modelos), tipo, sistemas, temas
--   C  descripción
--   D  texto extraído de los archivos
--
-- Máquinas: un documento asociado a una línea completa también indexa los nombres
-- de sus modelos ("gringa v" encuentra lo que aplica a toda la Gringa), y uno
-- asociado a un modelo indexa también el nombre de su línea.
CREATE OR REPLACE FUNCTION rebuild_document_search(doc_id uuid) RETURNS void
LANGUAGE sql AS $$
  UPDATE documentos d SET busqueda =
    setweight(to_tsvector('es_unaccent', coalesce(d.titulo, '')), 'A') ||
    setweight(to_tsvector('es_unaccent', coalesce((
      SELECT string_agg(n.nombre, ' ') FROM (
        SELECT e.nombre FROM documento_etiquetas de
          JOIN etiquetas e ON e.id = de.etiqueta_id WHERE de.documento_id = d.id
        UNION ALL
        SELECT l.nombre FROM documento_lineas dl
          JOIN lineas l ON l.id = dl.linea_id WHERE dl.documento_id = d.id
        UNION ALL
        SELECT m.nombre FROM documento_lineas dl
          JOIN modelos m ON m.linea_id = dl.linea_id WHERE dl.documento_id = d.id
        UNION ALL
        SELECT m.nombre || ' ' || l.nombre FROM documento_modelos dm
          JOIN modelos m ON m.id = dm.modelo_id
          JOIN lineas l ON l.id = m.linea_id WHERE dm.documento_id = d.id
        UNION ALL
        SELECT t.nombre FROM tipos t WHERE t.id = d.tipo_id
        UNION ALL
        SELECT s.nombre FROM documento_sistemas ds
          JOIN sistemas s ON s.id = ds.sistema_id WHERE ds.documento_id = d.id
        UNION ALL
        SELECT t.nombre FROM documento_temas dt
          JOIN temas t ON t.id = dt.tema_id WHERE dt.documento_id = d.id
      ) n
    ), '')), 'B') ||
    setweight(to_tsvector('es_unaccent', coalesce(d.descripcion, '')), 'C') ||
    -- Tope de texto para no pasar el límite de tamaño de tsvector (1 MB).
    setweight(to_tsvector('es_unaccent', coalesce((
      SELECT left(string_agg(a.texto_extraido, ' ' ORDER BY a.orden), 300000)
      FROM archivos a WHERE a.documento_id = d.id
    ), '')), 'D')
  WHERE d.id = doc_id;
$$;
--> statement-breakpoint

-- Documentos existentes (si los hay) quedan indexados.
SELECT rebuild_document_search(id) FROM documentos;
