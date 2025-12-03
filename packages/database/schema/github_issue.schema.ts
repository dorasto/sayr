import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { githubRepository } from "./github_repository.schema";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const githubIssue = table("github_issue", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	/** Repo relationship */
	repositoryId: v
		.text("repository_id")
		.notNull()
		.references(() => githubRepository.id, { onDelete: "cascade" }),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),

	/** GitHub issue data */
	issueNumber: v.integer("issue_number").notNull(),
	issueUrl: v.text("issue_url").notNull(),

	taskId: v
		.text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),

	/** Timestamps */
	createdAt: v.timestamp("created_at").defaultNow().notNull(),
	updatedAt: v.timestamp("updated_at").defaultNow().notNull(),
});

/** Type helpers */
export type githubIssueType = typeof githubIssue.$inferSelect;

/** Relations */
export const githubIssueRelations = relations(githubIssue, ({ one }) => ({
	repository: one(githubRepository, {
		fields: [githubIssue.repositoryId],
		references: [githubRepository.id],
	}),
	organization: one(organization, {
		fields: [githubIssue.organizationId],
		references: [organization.id],
	}),
	task: one(task, {
		fields: [githubIssue.taskId],
		references: [task.id],
	}),
}));
