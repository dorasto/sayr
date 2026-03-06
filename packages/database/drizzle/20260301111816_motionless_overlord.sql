ALTER TABLE "organization" ADD COLUMN "plan" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "polar_subscription_id" text;