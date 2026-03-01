ALTER TABLE "organization" ADD COLUMN "seat_count" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_period_end" timestamp;