import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { githubRepository } from "./github_repository.schema";
import { organization } from "./organization.schema";

/**
 * Represents a GitHub App installation (may contain many repos).
 */
export const githubInstallation = table("github_installation", {
	/** Primary key */
	id: v.text("id").primaryKey(),

	/** The GitHub installation ID from webhook payloads */
	organizationId: v.text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
	installationId: v.integer("installation_id").notNull().unique(),
	userId: v.text("user_id").references(() => user.id, { onDelete: "set null" }),

	/** Timestamps */
	createdAt: v.timestamp("created_at").defaultNow().notNull(),
	updatedAt: v.timestamp("updated_at").defaultNow().notNull(),
});

/** Type helpers */
export type githubInstallationType = typeof githubInstallation.$inferSelect;
export type githubInstallationInsert = typeof githubInstallation.$inferInsert;

/** Relations */
export const githubInstallationRelations = relations(githubInstallation, ({ many, one }) => ({
	repositories: many(githubRepository),
	user: one(user, {
		fields: [githubInstallation.userId],
		references: [user.id],
	}),
}));
