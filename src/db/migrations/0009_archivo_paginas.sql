CREATE TABLE "archivo_paginas" (
	"archivo_id" uuid NOT NULL,
	"pagina" integer NOT NULL,
	"busqueda" "tsvector" NOT NULL,
	CONSTRAINT "archivo_paginas_archivo_id_pagina_pk" PRIMARY KEY("archivo_id","pagina")
);
--> statement-breakpoint
ALTER TABLE "archivo_paginas" ADD CONSTRAINT "archivo_paginas_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivos"("id") ON DELETE cascade ON UPDATE no action;