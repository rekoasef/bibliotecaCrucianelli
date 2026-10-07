CREATE TABLE "vocabulario" (
	"palabra" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vocabulario_palabra_trgm" ON "vocabulario" USING gin ("palabra" gin_trgm_ops);