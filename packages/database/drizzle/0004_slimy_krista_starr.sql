CREATE TABLE "blocked_user" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"blocked_by" text NOT NULL,
	"reason" text,
	"created_at" timestamp,
	CONSTRAINT "unq_blocked_user_org" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_blocked_by_user_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_blocked_user_org" ON "blocked_user" USING btree ("organization_id");