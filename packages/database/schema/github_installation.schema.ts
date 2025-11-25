import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { githubRepository } from "./github_repository.schema";

/**
 * Represents a GitHub App installation (may contain many repos).
 */
export const githubInstallation = table("github_installation", {
	/** Primary key */
	id: v.text("id").primaryKey(),

	/** The GitHub installation ID from webhook payloads */
	installationId: v.integer("installation_id").notNull().unique(),

	/** Timestamps */
	createdAt: v.timestamp("created_at").defaultNow().notNull(),
	updatedAt: v.timestamp("updated_at").defaultNow().notNull(),
});

/** Type helpers */
export type githubInstallationType = typeof githubInstallation.$inferSelect;
export type githubInstallationInsert = typeof githubInstallation.$inferInsert;

/** Relations */
export const githubInstallationRelations = relations(githubInstallation, ({ many }) => ({
	repositories: many(githubRepository),
}));
