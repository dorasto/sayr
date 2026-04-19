CREATE TYPE "public"."release_update_health" AS ENUM('on_track', 'at_risk', 'off_track');--> statement-breakpoint
CREATE TYPE "public"."release_update_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TYPE "public"."release_comment_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TABLE "release_status_update" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"author_id" text,
	"content" jsonb,
	"health" "release_update_health" DEFAULT 'on_track' NOT NULL,
	"visibility" "release_update_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "release_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"status_update_id" text,
	"created_by" text,
	"content" jsonb,
	"visibility" "release_comment_visibility" DEFAULT 'public' NOT NULL,
	"parent_id" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "release_comment_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "release_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "release_label_unique" UNIQUE("release_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "settings" SET DEFAULT '{"allowActionsOnClosedTasks":true,"publicActions":true,"enablePublicPage":true,"publicTaskAllowBlank":true,"publicTaskFields":{"labels":true,"category":true,"priority":true},"ai":{"disabled":false,"rateLimited":null,"taskSummary":true,"taskSummaryCustomPrompt":null,"urlFetchEnabled":false}}'::json;--> statement-breakpoint
ALTER TABLE "release" ADD COLUMN "lead_id" text;--> statement-breakpoint
ALTER TABLE "release_status_update" ADD CONSTRAINT "release_status_update_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_status_update" ADD CONSTRAINT "release_status_update_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_status_update" ADD CONSTRAINT "release_status_update_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment" ADD CONSTRAINT "release_comment_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment" ADD CONSTRAINT "release_comment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment" ADD CONSTRAINT "release_comment_status_update_id_release_status_update_id_fk" FOREIGN KEY ("status_update_id") REFERENCES "public"."release_status_update"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment" ADD CONSTRAINT "release_comment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment" ADD CONSTRAINT "release_comment_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."release_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment_reaction" ADD CONSTRAINT "release_comment_reaction_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment_reaction" ADD CONSTRAINT "release_comment_reaction_comment_id_release_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."release_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_comment_reaction" ADD CONSTRAINT "release_comment_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_labels" ADD CONSTRAINT "release_labels_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_labels" ADD CONSTRAINT "release_labels_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_labels" ADD CONSTRAINT "release_labels_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_release_status_update_release" ON "release_status_update" USING btree ("release_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_status_update_org" ON "release_status_update" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_status_update_author" ON "release_status_update" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_release_comment_release" ON "release_comment" USING btree ("release_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_comment_status_update" ON "release_comment" USING btree ("status_update_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_comment_org" ON "release_comment" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_comment_creator" ON "release_comment" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_release_comment_parent" ON "release_comment" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_release_comment_reaction" ON "release_comment_reaction" USING btree ("comment_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "idx_release_comment_reaction_comment" ON "release_comment_reaction" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_release_comment_reaction_org" ON "release_comment_reaction" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;