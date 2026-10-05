CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'fabrica', 'concesionario');--> statement-breakpoint
CREATE TABLE "concesionarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"localidad" text NOT NULL,
	"provincia" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concesionarios_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagen" text,
	"rol" "rol_usuario" NOT NULL,
	"concesionario_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"ultimo_ingreso" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_rol_concesionario" CHECK (("usuarios"."rol" = 'concesionario') = ("usuarios"."concesionario_id" IS NOT NULL)),
	CONSTRAINT "usuarios_email_minusculas" CHECK ("usuarios"."email" = lower("usuarios"."email"))
);
--> statement-breakpoint
CREATE TABLE "cuentas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesiones_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limites_tasa" (
	"clave" text PRIMARY KEY NOT NULL,
	"cantidad" integer NOT NULL,
	"ventana_inicio" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_concesionario_id_concesionarios_id_fk" FOREIGN KEY ("concesionario_id") REFERENCES "public"."concesionarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuarios_concesionario_idx" ON "usuarios" USING btree ("concesionario_id");--> statement-breakpoint
CREATE INDEX "cuentas_user_idx" ON "cuentas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sesiones_user_idx" ON "sesiones" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verificaciones_identifier_idx" ON "verificaciones" USING btree ("identifier");