DROP INDEX "documentos_estado_vis";--> statement-breakpoint
CREATE INDEX "documentos_estado_idx" ON "documentos" USING btree ("estado");--> statement-breakpoint
ALTER TABLE "documentos" DROP COLUMN "visibilidad";--> statement-breakpoint
DROP TYPE "public"."visibilidad_doc";