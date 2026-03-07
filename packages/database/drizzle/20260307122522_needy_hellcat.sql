ALTER TYPE "public"."timeline_event_type" ADD VALUE 'github_branch_linked';--> statement-breakpoint
CREATE TABLE "github_branch_link" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text,
	"branch_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_branch_link" ADD CONSTRAINT "github_branch_link_repository_id_github_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_branch_link" ADD CONSTRAINT "github_branch_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_branch_link" ADD CONSTRAINT "github_branch_link_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_github_branch_link_repo" ON "github_branch_link" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "idx_github_branch_link_org" ON "github_branch_link" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_github_branch_link_task" ON "github_branch_link" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_github_branch_link_repo_branch" ON "github_branch_link" USING btree ("repository_id","branch_name");