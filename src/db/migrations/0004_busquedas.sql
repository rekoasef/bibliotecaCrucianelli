CREATE TABLE "busquedas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"texto" text,
	"filtros" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cantidad_resultados" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "busquedas" ADD CONSTRAINT "busquedas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "busquedas_sin_result_idx" ON "busquedas" USING btree ("creado_en") WHERE "busquedas"."cantidad_resultados" = 0;