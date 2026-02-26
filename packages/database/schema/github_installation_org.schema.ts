import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { githubInstallation } from "./github_installation.schema";
import { organization } from "./organization.schema";

/**
 * Junction table linking GitHub App installations to Sayr organizations.
 * Allows multiple Sayr orgs to share the same GitHub installation,
 * enabling different orgs to sync different repos from the same GitHub account.
 */
export const githubInstallationOrg = table(
	"github_installation_org",
	{
		/** Primary key */
		id: v.text("id").primaryKey(),

		/** The GitHub installation (references the numeric installation_id, cascades on delete) */
		installationId: v
			.integer("installation_id")
			.notNull()
			.references(() => githubInstallation.installationId, { onDelete: "cascade" }),

		/** The Sayr organization this installation is linked to */
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		/** The user who linked this installation to the org */
		userId: v
			.text("user_id")
			.references(() => user.id, { onDelete: "set null" }),

		/** Timestamps */
		createdAt: v.timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		/** Prevent the same installation from being linked to the same org twice */
		v.uniqueIndex("uq_github_installation_org").on(t.installationId, t.organizationId),

		/** Look up all orgs for a given installation */
		v.index("idx_github_installation_org_installation").on(t.installationId),

		/** Look up all installations for a given org */
		v.index("idx_github_installation_org_org").on(t.organizationId),
	],
);

/** Type helpers */
export type githubInstallationOrgType = typeof githubInstallationOrg.$inferSelect;
export type githubInstallationOrgInsert = typeof githubInstallationOrg.$inferInsert;

/** Relations */
export const githubInstallationOrgRelations = relations(githubInstallationOrg, ({ one }) => ({
	installation: one(githubInstallation, {
		fields: [githubInstallationOrg.installationId],
		references: [githubInstallation.installationId],
	}),
	organization: one(organization, {
		fields: [githubInstallationOrg.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [githubInstallationOrg.userId],
		references: [user.id],
	}),
}));
