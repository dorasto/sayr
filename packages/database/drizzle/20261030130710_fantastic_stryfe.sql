CREATE TYPE "public"."favourite_kind" AS ENUM('saved_view');--> statement-breakpoint
CREATE TABLE "favourite" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "favourite_kind" NOT NULL,
	"saved_view_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp,
	CONSTRAINT "unq_favourite_user_saved_view" UNIQUE("user_id","saved_view_id"),
	CONSTRAINT "chk_favourite_target" CHECK (("favourite"."kind" = 'saved_view') = ("favourite"."saved_view_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_saved_view_id_saved_view_id_fk" FOREIGN KEY ("saved_view_id") REFERENCES "public"."saved_view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_favourite_user_position" ON "favourite" USING btree ("user_id","position");--> statement-breakpoint
-- SAY-104: carry existing pins (personal views with saved_view.pinned) over, keeping each user's order.
INSERT INTO "favourite" ("id", "user_id", "kind", "saved_view_id", "position", "created_at")
SELECT
	gen_random_uuid()::text,
	"created_by_id",
	'saved_view',
	"id",
	(row_number() OVER (PARTITION BY "created_by_id" ORDER BY "position", "created_at")) - 1,
	now()
FROM "saved_view"
WHERE "pinned" = true AND "organization_id" IS NULL AND "created_by_id" IS NOT NULL;
