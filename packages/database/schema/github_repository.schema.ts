import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category } from "./category.schema";
import { githubInstallation } from "./github_installation.schema";
import { organization } from "./organization.schema";

/**
 * Represents a repository under a GitHub installation,
 * optionally linked to a Sayr organization and/or category.
 */
export const githubRepository = table("github_repository", {
	/** Primary key */
	id: v.text("id").primaryKey(),

	/** FK to installation */
	installationId: v
		.integer("installation_id")
		.notNull()
		.references(() => githubInstallation.installationId, { onDelete: "cascade" }),

	/** Repo-specific data */
	repoId: v.integer("repo_id").notNull(),
	repoName: v.text("repo_name").notNull(),

	organizationId: v.text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
	categoryId: v.text("category_id").references(() => category.id, { onDelete: "cascade" }),
	userId: v.text("user_id").references(() => user.id, { onDelete: "set null" }),
	/** Timestamps */
	createdAt: v.timestamp("created_at").defaultNow().notNull(),
	updatedAt: v.timestamp("updated_at").defaultNow().notNull(),
});

/** Type helpers */
export type githubRepositoryType = typeof githubRepository.$inferSelect;
export type githubRepositoryInsert = typeof githubRepository.$inferInsert;

/** Relations */
export const githubRepositoryRelations = relations(githubRepository, ({ one }) => ({
	installation: one(githubInstallation, {
		fields: [githubRepository.installationId],
		references: [githubInstallation.id],
	}),
	organization: one(organization, {
		fields: [githubRepository.organizationId],
		references: [organization.id],
	}),
	category: one(category, {
		fields: [githubRepository.categoryId],
		references: [category.id],
	}),
	user: one(user, {
		fields: [githubRepository.userId],
		references: [user.id],
	}),
}));
