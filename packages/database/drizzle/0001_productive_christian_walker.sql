ALTER TABLE "task_comment" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_comment_parent" ON "task_comment" USING btree ("parent_id");