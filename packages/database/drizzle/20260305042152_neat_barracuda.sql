ALTER TABLE "team" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "created_by" text;--> statement-breakpoint
CREATE INDEX "idx_org_created_by" ON "organization" USING btree ("created_by");