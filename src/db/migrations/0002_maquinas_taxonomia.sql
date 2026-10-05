CREATE TABLE "lineas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segmento_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"descripcion" text,
	"imagen_drive_file_id" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lineas_slug_unique" UNIQUE("slug"),
	CONSTRAINT "lineas_segmento_nombre_unique" UNIQUE("segmento_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "modelos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linea_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modelos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "modelos_linea_nombre_unique" UNIQUE("linea_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "segmentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "segmentos_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "segmentos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "etiquetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_normalizado" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "etiquetas_nombre_normalizado_unique" UNIQUE("nombre_normalizado")
);
--> statement-breakpoint
CREATE TABLE "sistemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sistemas_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "sistemas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "temas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "temas_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "temas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "tipos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "lineas" ADD CONSTRAINT "lineas_segmento_id_segmentos_id_fk" FOREIGN KEY ("segmento_id") REFERENCES "public"."segmentos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_linea_id_lineas_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."lineas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lineas_segmento_idx" ON "lineas" USING btree ("segmento_id");--> statement-breakpoint
CREATE INDEX "modelos_linea_idx" ON "modelos" USING btree ("linea_id");--> statement-breakpoint
CREATE INDEX "etiquetas_nombre_trgm" ON "etiquetas" USING gin ("nombre_normalizado" gin_trgm_ops);