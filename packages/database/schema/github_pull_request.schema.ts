import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { githubRepository } from "./github_repository.schema";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const githubPullRequest = table(
	"github_pull_request",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),

		/** Relationships */
		repositoryId: v
			.text("repository_id")
			.notNull()
			.references(() => githubRepository.id, {
				onDelete: "cascade",
			}),

		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, {
				onDelete: "cascade",
			}),

		taskId: v
			.text("task_id")
			.references(() => task.id, {
				onDelete: "set null",
			}),

		/** GitHub Data */
		prNumber: v.integer("pr_number").notNull(),
		prUrl: v.text("pr_url").notNull(),

		title: v.text("title").notNull(),
		body: v.text("body"),

		headSha: v.text("head_sha").notNull(),
		baseBranch: v.text("base_branch").notNull(),
		headBranch: v.text("head_branch").notNull(),

		state: v.text("state").notNull(), // open | closed
		merged: v.boolean("merged").default(false).notNull(),

		mergeCommitSha: v.text("merge_commit_sha"),

		createdAt: v
			.timestamp("created_at")
			.defaultNow()
			.notNull(),

		updatedAt: v
			.timestamp("updated_at")
			.defaultNow()
			.notNull(),
	},
	(t) => [
		v.index("idx_github_pr_repo").on(t.repositoryId),
		v.index("idx_github_pr_org").on(t.organizationId),
		v.index("idx_github_pr_number").on(
			t.repositoryId,
			t.prNumber
		),
		v.uniqueIndex("uq_github_pr_repo_number").on(
			t.repositoryId,
			t.prNumber
		),
	]
);

export type githubPullRequestType =
	typeof githubPullRequest.$inferSelect;

export const githubPullRequestRelations =
	relations(githubPullRequest, ({ one }) => ({
		repository: one(githubRepository, {
			fields: [githubPullRequest.repositoryId],
			references: [githubRepository.id],
		}),
		organization: one(organization, {
			fields: [githubPullRequest.organizationId],
			references: [organization.id],
		}),
		task: one(task, {
			fields: [githubPullRequest.taskId],
			references: [task.id],
		}),
	}));