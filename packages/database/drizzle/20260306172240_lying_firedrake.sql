CREATE TYPE "public"."task_relation_type" AS ENUM('related', 'blocking', 'duplicate');--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'parent_added';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'parent_removed';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'subtask_added';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'subtask_removed';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'relation_added';--> statement-breakpoint
ALTER TYPE "public"."timeline_event_type" ADD VALUE 'relation_removed';--> statement-breakpoint
CREATE TABLE "task_relation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source_task_id" text NOT NULL,
	"target_task_id" text NOT NULL,
	"type" "task_relation_type" NOT NULL,
	"created_at" timestamp,
	"created_by" text,
	CONSTRAINT "task_relation_unique" UNIQUE("source_task_id","target_task_id","type")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "task_relation" ADD CONSTRAINT "task_relation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_relation" ADD CONSTRAINT "task_relation_source_task_id_task_id_fk" FOREIGN KEY ("source_task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_relation" ADD CONSTRAINT "task_relation_target_task_id_task_id_fk" FOREIGN KEY ("target_task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_relation" ADD CONSTRAINT "task_relation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_relation_source" ON "task_relation" USING btree ("source_task_id");--> statement-breakpoint
CREATE INDEX "idx_task_relation_target" ON "task_relation" USING btree ("target_task_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_parent_id" ON "task" USING btree ("parent_id");