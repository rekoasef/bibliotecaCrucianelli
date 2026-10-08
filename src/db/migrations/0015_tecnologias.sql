CREATE TABLE "tecnologias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tecnologias_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "tecnologias_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documento_tecnologias" (
	"documento_id" uuid NOT NULL,
	"tecnologia_id" uuid NOT NULL,
	CONSTRAINT "documento_tecnologias_documento_id_tecnologia_id_pk" PRIMARY KEY("documento_id","tecnologia_id")
);
--> statement-breakpoint
ALTER TABLE "documento_tecnologias" ADD CONSTRAINT "documento_tecnologias_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_tecnologias" ADD CONSTRAINT "documento_tecnologias_tecnologia_id_tecnologias_id_fk" FOREIGN KEY ("tecnologia_id") REFERENCES "public"."tecnologias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documento_tecnologias_tecnologia_id_idx" ON "documento_tecnologias" USING btree ("tecnologia_id");