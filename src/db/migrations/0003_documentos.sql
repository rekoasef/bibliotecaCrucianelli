CREATE TYPE "public"."accion_acceso" AS ENUM('ver', 'descargar', 'video');--> statement-breakpoint
CREATE TYPE "public"."estado_doc" AS ENUM('borrador', 'vigente', 'obsoleto');--> statement-breakpoint
CREATE TYPE "public"."estado_extraccion" AS ENUM('pendiente', 'procesando', 'ok', 'sin_texto', 'error', 'no_aplica');--> statement-breakpoint
CREATE TYPE "public"."modo_acceso" AS ENUM('servidor', 'publico');--> statement-breakpoint
CREATE TYPE "public"."visibilidad_doc" AS ENUM('concesionarios', 'fabrica');--> statement-breakpoint
CREATE TABLE "accesos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	"archivo_id" uuid,
	"accion" "accion_acceso" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documento_id" uuid NOT NULL,
	"drive_file_id" text NOT NULL,
	"nombre" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamano_bytes" bigint,
	"drive_modificado_en" timestamp with time zone,
	"modo_acceso" "modo_acceso" DEFAULT 'servidor' NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"disponible" boolean DEFAULT true NOT NULL,
	"texto_extraido" text,
	"estado_extraccion" "estado_extraccion" DEFAULT 'pendiente' NOT NULL,
	"extraccion_error" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archivos_drive_file_id_unique" UNIQUE("drive_file_id")
);
--> statement-breakpoint
CREATE TABLE "documento_etiquetas" (
	"documento_id" uuid NOT NULL,
	"etiqueta_id" uuid NOT NULL,
	CONSTRAINT "documento_etiquetas_documento_id_etiqueta_id_pk" PRIMARY KEY("documento_id","etiqueta_id")
);
--> statement-breakpoint
CREATE TABLE "documento_lineas" (
	"documento_id" uuid NOT NULL,
	"linea_id" uuid NOT NULL,
	CONSTRAINT "documento_lineas_documento_id_linea_id_pk" PRIMARY KEY("documento_id","linea_id")
);
--> statement-breakpoint
CREATE TABLE "documento_modelos" (
	"documento_id" uuid NOT NULL,
	"modelo_id" uuid NOT NULL,
	CONSTRAINT "documento_modelos_documento_id_modelo_id_pk" PRIMARY KEY("documento_id","modelo_id")
);
--> statement-breakpoint
CREATE TABLE "documento_sistemas" (
	"documento_id" uuid NOT NULL,
	"sistema_id" uuid NOT NULL,
	CONSTRAINT "documento_sistemas_documento_id_sistema_id_pk" PRIMARY KEY("documento_id","sistema_id")
);
--> statement-breakpoint
CREATE TABLE "documento_temas" (
	"documento_id" uuid NOT NULL,
	"tema_id" uuid NOT NULL,
	CONSTRAINT "documento_temas_documento_id_tema_id_pk" PRIMARY KEY("documento_id","tema_id")
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text,
	"descripcion" text,
	"tipo_id" uuid,
	"visibilidad" "visibilidad_doc" DEFAULT 'concesionarios' NOT NULL,
	"estado" "estado_doc" DEFAULT 'borrador' NOT NULL,
	"reemplazado_por_id" uuid,
	"reemplaza_id" uuid,
	"version" text,
	"fecha_documento" date,
	"publicado_en" timestamp with time zone,
	"requiere_revision" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"actualizado_por" uuid,
	"busqueda" "tsvector",
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documentos_reemplazado_solo_obsoleto" CHECK ("documentos"."reemplazado_por_id" IS NULL OR "documentos"."estado" = 'obsoleto'),
	CONSTRAINT "documentos_no_se_reemplaza_a_si_mismo" CHECK ("documentos"."reemplazado_por_id" <> "documentos"."id"),
	CONSTRAINT "documentos_publicado_completo" CHECK ("documentos"."estado" = 'borrador' OR ("documentos"."titulo" IS NOT NULL AND "documentos"."tipo_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "accesos" ADD CONSTRAINT "accesos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accesos" ADD CONSTRAINT "accesos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accesos" ADD CONSTRAINT "accesos_archivo_id_archivos_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_etiquetas" ADD CONSTRAINT "documento_etiquetas_etiqueta_id_etiquetas_id_fk" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiquetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_lineas" ADD CONSTRAINT "documento_lineas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_lineas" ADD CONSTRAINT "documento_lineas_linea_id_lineas_id_fk" FOREIGN KEY ("linea_id") REFERENCES "public"."lineas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_sistemas" ADD CONSTRAINT "documento_sistemas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_sistemas" ADD CONSTRAINT "documento_sistemas_sistema_id_sistemas_id_fk" FOREIGN KEY ("sistema_id") REFERENCES "public"."sistemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_temas" ADD CONSTRAINT "documento_temas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_temas" ADD CONSTRAINT "documento_temas_tema_id_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."temas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tipo_id_tipos_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_reemplazado_por_id_documentos_id_fk" FOREIGN KEY ("reemplazado_por_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_reemplaza_id_documentos_id_fk" FOREIGN KEY ("reemplaza_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesos_documento_idx" ON "accesos" USING btree ("documento_id","creado_en");--> statement-breakpoint
CREATE INDEX "accesos_usuario_idx" ON "accesos" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE INDEX "archivos_documento_idx" ON "archivos" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX "archivos_extraccion_idx" ON "archivos" USING btree ("estado_extraccion") WHERE "archivos"."estado_extraccion" = 'pendiente';--> statement-breakpoint
CREATE INDEX "documento_etiquetas_etiqueta_id_idx" ON "documento_etiquetas" USING btree ("etiqueta_id");--> statement-breakpoint
CREATE INDEX "documento_lineas_linea_id_idx" ON "documento_lineas" USING btree ("linea_id");--> statement-breakpoint
CREATE INDEX "documento_modelos_modelo_id_idx" ON "documento_modelos" USING btree ("modelo_id");--> statement-breakpoint
CREATE INDEX "documento_sistemas_sistema_id_idx" ON "documento_sistemas" USING btree ("sistema_id");--> statement-breakpoint
CREATE INDEX "documento_temas_tema_id_idx" ON "documento_temas" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX "documentos_busqueda_idx" ON "documentos" USING gin ("busqueda");--> statement-breakpoint
CREATE INDEX "documentos_titulo_trgm" ON "documentos" USING gin (f_unaccent_lower("titulo") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "documentos_estado_vis" ON "documentos" USING btree ("estado","visibilidad");--> statement-breakpoint
CREATE INDEX "documentos_tipo_idx" ON "documentos" USING btree ("tipo_id");