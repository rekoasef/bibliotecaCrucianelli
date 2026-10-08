CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"slug" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_nombre_unique" UNIQUE("nombre"),
	CONSTRAINT "productos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documento_productos" (
	"documento_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	CONSTRAINT "documento_productos_documento_id_producto_id_pk" PRIMARY KEY("documento_id","producto_id")
);
--> statement-breakpoint
ALTER TABLE "accesos" ALTER COLUMN "usuario_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "busquedas" ALTER COLUMN "usuario_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "ultima_actividad" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "pausado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "visible_concesionarios" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "visible_clientes" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documento_productos" ADD CONSTRAINT "documento_productos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_productos" ADD CONSTRAINT "documento_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documento_productos_producto_id_idx" ON "documento_productos" USING btree ("producto_id");--> statement-breakpoint
-- Visibilidad: "concesionarios" → visible para concesionarios; "fabrica" → solo fábrica.
UPDATE "documentos" SET "visible_concesionarios" = ("visibilidad" = 'concesionarios');--> statement-breakpoint
-- La inactividad se cuenta desde el último uso; hasta ahora solo había último ingreso.
UPDATE "usuarios" SET "ultima_actividad" = "ultimo_ingreso";
