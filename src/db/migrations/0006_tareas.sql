CREATE TABLE "tareas" (
	"nombre" text PRIMARY KEY NOT NULL,
	"ultima_ejecucion" timestamp with time zone NOT NULL,
	"resultado" jsonb
);
