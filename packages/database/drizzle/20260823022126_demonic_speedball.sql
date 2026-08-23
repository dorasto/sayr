ALTER TABLE "api_key" DROP CONSTRAINT "api_key_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "apikey_user_idx";--> statement-breakpoint
DROP INDEX "apikey_referenceId_idx";--> statement-breakpoint
CREATE INDEX "apikey_referenceId_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "api_key" DROP COLUMN "reference_id";
