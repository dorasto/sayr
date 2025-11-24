import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { category } from "./category.schema";
import { organization } from "./organization.schema";

/**
 * Links a Sayr organization to a GitHub App installation
 * and optionally individual repositories (for webhook routing and worker context).
 */
export const githubIntegration = table("github_integration", {
	/** Primary key for internal reference */
	id: v.text("id").primaryKey(),

	/** The GitHub installation ID from webhook payloads */
	installationId: v.integer("installation_id").notNull(),

	/** The GitHub repository ID (for single-repo installs) */
	repoId: v.integer("repo_id").notNull(),

	/** Repository name (e.g., "sayr") */
	repoName: v.text("repo_name").notNull(),

	/** Repository owner/org name (e.g., "trent") */
	owner: v.text("owner").notNull(),

	/** Associated Sayr org and category */
	organizationId: v.text("organization_id").references(() => organization.id),
	categoryId: v.text("category_id").references(() => category.id),
	/** Timestamps */
	createdAt: v.timestamp("created_at").defaultNow().notNull(),
	updatedAt: v.timestamp("updated_at").defaultNow().notNull(),
});

/** Type helpers */
export type githubIntegrationType = typeof githubIntegration.$inferSelect;
export type githubIntegrationInsert = typeof githubIntegration.$inferInsert;

/** Relations */
export const githubIntegrationRelations = relations(githubIntegration, ({ one }) => ({
	organization: one(organization, {
		fields: [githubIntegration.organizationId],
		references: [organization.id],
	}),
	category: one(category, {
		fields: [githubIntegration.categoryId],
		references: [category.id],
	}),
}));
