-- Corrección de errores de tipeo con el vocabulario de la biblioteca
-- (docs/02-arquitectura.md, "Errores de tipeo").
--
-- levenshtein() decide si una palabra del vocabulario está lo bastante cerca de
-- la escrita (pg_trgm solo trae los candidatos).
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
--> statement-breakpoint

-- Igual que en 0005 (mismos textos y pesos), y además agrega las palabras del
-- documento a `vocabulario`. Las palabras salen sin raíz (config `simple`) para
-- poder mostrarlas: "dosificacion", no "dosif".
CREATE OR REPLACE FUNCTION rebuild_document_search(doc_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  texto_a text;
  texto_b text;
  texto_c text;
  texto_d text;
BEGIN
  SELECT
    coalesce(d.titulo, ''),
    coalesce((
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
    ), ''),
    coalesce(d.descripcion, ''),
    -- Tope de texto para no pasar el límite de tamaño de tsvector (1 MB).
    coalesce((
      SELECT left(string_agg(a.texto_extraido, ' ' ORDER BY a.orden), 300000)
      FROM archivos a WHERE a.documento_id = d.id
    ), '')
  INTO texto_a, texto_b, texto_c, texto_d
  FROM documentos d WHERE d.id = doc_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE documentos SET busqueda =
    setweight(to_tsvector('es_unaccent', texto_a), 'A') ||
    setweight(to_tsvector('es_unaccent', texto_b), 'B') ||
    setweight(to_tsvector('es_unaccent', texto_c), 'C') ||
    setweight(to_tsvector('es_unaccent', texto_d), 'D')
  WHERE id = doc_id;

  -- Solo palabras de letras (sin números ni códigos) de 4 a 30 caracteres.
  -- ORDER BY: mismo orden de inserción en todas las transacciones (sin deadlocks).
  INSERT INTO vocabulario (palabra)
    SELECT lexeme FROM unnest(to_tsvector('simple',
      f_unaccent_lower(concat_ws(' ', texto_a, texto_b, texto_c, texto_d))))
    WHERE lexeme ~ '^[a-z]{4,30}$'
    ORDER BY lexeme
  ON CONFLICT DO NOTHING;
END;
$$;
--> statement-breakpoint

-- Vocabulario de los documentos existentes.
SELECT rebuild_document_search(id) FROM documentos;
