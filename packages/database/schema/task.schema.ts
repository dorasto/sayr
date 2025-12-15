import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category } from "./category.schema";
import { githubIssue } from "./github_issue.schema";
import { taskLabelAssignment } from "./label.schema";
import { organization } from "./organization.schema";
import { taskAssignee } from "./taskAssignee.schema";
import { taskComment } from "./taskComment.schema";
import { taskTimeline } from "./taskTimeline.schema";
import type { NodeJSON } from ".";
export const visibleEnum = v.pgEnum("visible", ["public", "private"]);
export const statusEnum = v.pgEnum("status", ["backlog", "todo", "in-progress", "done", "canceled"]);
export const priorityEnum = v.pgEnum("priority", ["none", "low", "medium", "high", "urgent"]);

export const task = table("task", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	shortId: v.integer("short_id"),
	visible: visibleEnum("visible").default("public").notNull(), // enum-like field
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	title: v.text("title"),
	description: v.jsonb("description").$type<NodeJSON>(),
	status: statusEnum("todo").notNull(),
	priority: priorityEnum("none").notNull(),
	createdBy: v.text("created_by").references(() => user.id, { onDelete: "set null" }),
	category: v.text("category").references(() => category.id, { onDelete: "set null" }),
});

export type taskType = typeof task.$inferSelect;

export const taskUniquePerProject = v.unique("task_organization_shortid_unique").on(task.organizationId, task.shortId);

export const taskRelations = relations(task, ({ one, many }) => ({
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id],
	}),
	createdBy: one(user, {
		fields: [task.createdBy],
		references: [user.id],
	}),
	category: one(category, {
		fields: [task.category],
		references: [category.id],
	}),
	labels: many(taskLabelAssignment),
	assignees: many(taskAssignee),
	timeline: many(taskTimeline),
	comments: many(taskComment),
	githubIssue: one(githubIssue, {
		fields: [task.id],
		references: [githubIssue.taskId],
	}),
}));
