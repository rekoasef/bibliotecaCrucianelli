-- Extensiones y configuración de búsqueda (docs/02-arquitectura.md, docs/03-modelo-de-datos.md)

CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

-- Configuración de texto en español que ignora acentos: "regulacion" encuentra "regulación".
CREATE TEXT SEARCH CONFIGURATION es_unaccent (COPY = spanish);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION es_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, spanish_stem;
--> statement-breakpoint

-- unaccent() no es IMMUTABLE, así que no se puede usar en índices.
-- Este wrapper fija el diccionario y se usa en los índices trigram (título, etiquetas).
CREATE FUNCTION f_unaccent_lower(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, $1)) $$;
