ALTER TABLE "member" ADD COLUMN "seat_assigned_id" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "seat_assigned" boolean DEFAULT false NOT NULL;