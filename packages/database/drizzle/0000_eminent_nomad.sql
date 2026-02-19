CREATE TYPE "public"."release_status" AS ENUM('planned', 'in-progress', 'released', 'archived');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('none', 'low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('backlog', 'todo', 'in-progress', 'done', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."visible" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."task_comment_source" AS ENUM('sayr', 'github');--> statement-breakpoint
CREATE TYPE "public"."task_comment_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('status_change', 'priority_change', 'comment', 'label_added', 'label_removed', 'assignee_added', 'assignee_removed', 'created', 'updated', 'category_change', 'release_change', 'github_commit_ref');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('mention', 'status_change', 'priority_change', 'assignee_added', 'assignee_removed', 'comment');--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean NOT NULL,
	"rate_limit_enabled" boolean NOT NULL,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer NOT NULL,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"permissions" text,
	"metadata" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar NOT NULL,
	"color" varchar DEFAULT 'hsla(0, 0%, 0%, 1)',
	"icon" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"installation_id" integer NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installation_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "github_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"repository_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"issue_number" integer NOT NULL,
	"issue_url" text NOT NULL,
	"task_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repository" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"repo_id" integer NOT NULL,
	"repo_name" text NOT NULL,
	"organization_id" text,
	"category_id" text,
	"user_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"invited_by_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invite_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "invite_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "label" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar DEFAULT '#cccccc',
	"visible" "visible" DEFAULT 'public' NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"label_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp,
	CONSTRAINT "unq_member_org_user" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "member_team" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"team_id" text NOT NULL,
	CONSTRAINT "unq_member_team" UNIQUE("member_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" json DEFAULT '{"admin":{"administrator":false,"manageMembers":false,"manageTeams":false},"content":{"manageCategories":false,"manageLabels":false,"manageViews":false},"tasks":{"create":true,"editAny":false,"deleteAny":false,"assign":false,"changeStatus":true,"changePriority":true},"moderation":{"manageComments":false,"approveSubmissions":false,"manageVotes":false}}'::json NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"banner_img" text,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"private_id" text
);
--> statement-breakpoint
CREATE TABLE "release" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar NOT NULL,
	"slug" text NOT NULL,
	"description" jsonb,
	"status" "release_status" DEFAULT 'planned' NOT NULL,
	"target_date" timestamp,
	"released_at" timestamp,
	"color" varchar DEFAULT 'hsla(0, 0%, 0%, 1)',
	"icon" text,
	"created_by" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "release_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE "saved_view" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_id" text,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"filter_params" text NOT NULL,
	"view_config" jsonb DEFAULT '{"mode":"list","groupBy":"status","showCompletedTasks":true}'::jsonb,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"short_id" integer,
	"visible" "visible" DEFAULT 'public' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"title" text,
	"description" jsonb,
	"todo" "status" NOT NULL,
	"none" "priority" NOT NULL,
	"created_by" text,
	"category" text,
	"release_id" text,
	"vote_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "task_organization_shortid_unique" UNIQUE("organization_id","short_id")
);
--> statement-breakpoint
CREATE TABLE "task_assignee" (
	"task_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"content" jsonb,
	"created_by" text,
	"visibility" "task_comment_visibility" DEFAULT 'public' NOT NULL,
	"source" "task_comment_source" DEFAULT 'sayr' NOT NULL,
	"external_author_login" text,
	"external_author_url" text,
	"external_issue_number" integer,
	"external_comment_id" bigint,
	"external_comment_url" text
);
--> statement-breakpoint
CREATE TABLE "task_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"actor_id" text,
	"event_type" timeline_event_type NOT NULL,
	"from_value" jsonb,
	"to_value" jsonb,
	"content" jsonb,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_comment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text,
	"comment_id" text NOT NULL,
	"edited_at" timestamp,
	"edited_by" text,
	"content" jsonb
);
--> statement-breakpoint
CREATE TABLE "task_comment_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"title_prefix" varchar(50),
	"description" jsonb,
	"status" text,
	"priority" text,
	"category_id" text,
	"release_id" text,
	"visible" text,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_template_assignee" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_template_label" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"label_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text,
	"anon_hash" text,
	"created_at" timestamp,
	CONSTRAINT "task_vote_user_unique" UNIQUE("task_id","user_id"),
	CONSTRAINT "task_vote_anon_unique" UNIQUE("task_id","anon_hash")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"task_id" text NOT NULL,
	"timeline_event_id" text,
	"type" "notification_type" NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_issue" ADD CONSTRAINT "github_issue_repository_id_github_repository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repository"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_issue" ADD CONSTRAINT "github_issue_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_issue" ADD CONSTRAINT "github_issue_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repository" ADD CONSTRAINT "github_repository_installation_id_github_installation_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installation"("installation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repository" ADD CONSTRAINT "github_repository_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repository" ADD CONSTRAINT "github_repository_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repository" ADD CONSTRAINT "github_repository_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_team" ADD CONSTRAINT "member_team_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_team" ADD CONSTRAINT "member_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_view" ADD CONSTRAINT "saved_view_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_view" ADD CONSTRAINT "saved_view_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_category_category_id_fk" FOREIGN KEY ("category") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_timeline" ADD CONSTRAINT "task_timeline_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_timeline" ADD CONSTRAINT "task_timeline_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_timeline" ADD CONSTRAINT "task_timeline_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_history" ADD CONSTRAINT "task_comment_history_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_history" ADD CONSTRAINT "task_comment_history_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_history" ADD CONSTRAINT "task_comment_history_comment_id_task_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."task_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_history" ADD CONSTRAINT "task_comment_history_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_reaction" ADD CONSTRAINT "task_comment_reaction_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_reaction" ADD CONSTRAINT "task_comment_reaction_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_reaction" ADD CONSTRAINT "task_comment_reaction_comment_id_task_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."task_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_reaction" ADD CONSTRAINT "task_comment_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template" ADD CONSTRAINT "task_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template" ADD CONSTRAINT "task_template_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template" ADD CONSTRAINT "task_template_release_id_release_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."release"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_assignee" ADD CONSTRAINT "task_template_assignee_template_id_task_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_assignee" ADD CONSTRAINT "task_template_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_label" ADD CONSTRAINT "task_template_label_template_id_task_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_label" ADD CONSTRAINT "task_template_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_vote" ADD CONSTRAINT "task_vote_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_vote" ADD CONSTRAINT "task_vote_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_vote" ADD CONSTRAINT "task_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_timeline_event_id_task_timeline_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."task_timeline"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "api_key" USING btree ("key");--> statement-breakpoint
CREATE INDEX "apikey_user_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_enabled_idx" ON "api_key" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_github_repo_org" ON "github_repository" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_github_repo_installation" ON "github_repository" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "idx_github_repo_repo" ON "github_repository" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "idx_github_repo_category" ON "github_repository" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_github_repo_org_enabled" ON "github_repository" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_team_org_name" ON "team" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_release_org_status" ON "release" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_release_org_createdat" ON "release" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_release_org_targetdate" ON "release" USING btree ("organization_id","target_date");--> statement-breakpoint
CREATE INDEX "idx_task_org_status_priority" ON "task" USING btree ("organization_id","todo","none");--> statement-breakpoint
CREATE INDEX "idx_task_org_createdat" ON "task" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_created_by" ON "task" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_task_org_category" ON "task" USING btree ("organization_id","category");--> statement-breakpoint
CREATE INDEX "idx_task_org_release" ON "task" USING btree ("organization_id","release_id");--> statement-breakpoint
CREATE INDEX "idx_task_comment_task" ON "task_comment" USING btree ("organization_id","task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_comment_creator" ON "task_comment" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_task_comment_external_author" ON "task_comment" USING btree ("external_author_login");--> statement-breakpoint
CREATE INDEX "idx_task_timeline_task" ON "task_timeline" USING btree ("organization_id","task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_timeline_actor" ON "task_timeline" USING btree ("organization_id","actor_id");--> statement-breakpoint
CREATE INDEX "idx_task_comment_history_comment" ON "task_comment_history" USING btree ("organization_id","task_id","comment_id","edited_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_comment_reaction" ON "task_comment_reaction" USING btree ("comment_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "idx_comment_reaction_comment" ON "task_comment_reaction" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "idx_comment_reaction_task" ON "task_comment_reaction" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_comment_reaction_org" ON "task_comment_reaction" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_task_vote_task" ON "task_vote" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_notification_user" ON "notification" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_user_org" ON "notification" USING btree ("user_id","organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_task" ON "notification" USING btree ("task_id");