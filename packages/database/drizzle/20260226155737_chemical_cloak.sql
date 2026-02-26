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
CREATE TABLE "github_installation_org" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_user" ADD CONSTRAINT "blocked_user_blocked_by_user_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation_org" ADD CONSTRAINT "github_installation_org_installation_id_github_installation_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installation"("installation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation_org" ADD CONSTRAINT "github_installation_org_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation_org" ADD CONSTRAINT "github_installation_org_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_blocked_user_org" ON "blocked_user" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_github_installation_org" ON "github_installation_org" USING btree ("installation_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_github_installation_org_installation" ON "github_installation_org" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "idx_github_installation_org_org" ON "github_installation_org" USING btree ("organization_id");--> statement-breakpoint
