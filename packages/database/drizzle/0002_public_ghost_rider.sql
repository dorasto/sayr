CREATE TABLE "github_pull_request" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text,
	"pr_number" integer NOT NULL,
	"pr_url" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"head_sha" text NOT NULL,
	"base_branch" text NOT NULL,
	"head_branch" text NOT NULL,
	"state" text NOT NULL,
	"merged" boolean DEFAULT false NOT NULL,
	"merge_commit_sha" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_pull_request" ADD CONSTRAINT "github_pull_request_repository_id_github_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_request" ADD CONSTRAINT "github_pull_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_request" ADD CONSTRAINT "github_pull_request_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_github_pr_repo" ON "github_pull_request" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "idx_github_pr_org" ON "github_pull_request" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_github_pr_number" ON "github_pull_request" USING btree ("repository_id","pr_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_github_pr_repo_number" ON "github_pull_request" USING btree ("repository_id","pr_number");