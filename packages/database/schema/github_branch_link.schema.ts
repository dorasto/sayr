import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { githubRepository } from "./github_repository.schema";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const githubBranchLink = table(
    "github_branch_link",
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

        branchName: v.text("branch_name").notNull(),

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
        v.index("idx_github_branch_link_repo").on(t.repositoryId),
        v.index("idx_github_branch_link_org").on(t.organizationId),
        v.index("idx_github_branch_link_task").on(t.taskId),
        v.uniqueIndex("uq_github_branch_link_repo_branch").on(
            t.repositoryId,
            t.branchName
        ),
    ]
);

export type GithubBranchLinkType =
    typeof githubBranchLink.$inferSelect;

export const githubBranchLinkRelations = relations(
    githubBranchLink,
    ({ one }) => ({
        repository: one(githubRepository, {
            fields: [githubBranchLink.repositoryId],
            references: [githubRepository.id],
        }),
        organization: one(organization, {
            fields: [githubBranchLink.organizationId],
            references: [organization.id],
        }),
        task: one(task, {
            fields: [githubBranchLink.taskId],
            references: [task.id],
        }),
    })
);