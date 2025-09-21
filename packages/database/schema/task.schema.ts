import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { taskLabelAssignment } from "./label.schema";
import { organization } from "./organization.schema";
import { project } from "./project.schema";
import { taskComment } from "./taskComment.schema";
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
	projectId: v
		.text("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	shortId: v.integer("short_id"),
	visible: visibleEnum("visible").default("public"), // enum-like field
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	title: v.text("title"),
	description: v.jsonb("description").default([]),
	status: statusEnum("todo"),
	priority: priorityEnum("none"),
	createdBy: v.text("created_by").references(() => user.id),
});

export type taskType = typeof task.$inferSelect;

export const taskUniquePerProject = v.unique("task_project_shortid_unique").on(task.projectId, task.shortId);

export const taskRelations = relations(task, ({ one, many }) => ({
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id],
	}),
	project: one(project, {
		fields: [task.projectId],
		references: [project.id],
	}),
	createdBy: one(user, {
		fields: [task.createdBy],
		references: [user.id],
	}),
	comments: many(taskComment),
	labels: many(taskLabelAssignment),
	assignees: many(taskAssignee),
}));

// A join table to assign multiple users to a single task
export const taskAssignee = table("task_assignee", {
	taskId: v
		.text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),

	userId: v
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export type taskAssigneeType = typeof taskAssignee.$inferSelect;

// Relations
export const taskAssigneeRelations = relations(taskAssignee, ({ one }) => ({
	task: one(task, {
		fields: [taskAssignee.taskId],
		references: [task.id],
	}),
	user: one(user, {
		fields: [taskAssignee.userId],
		references: [user.id],
	}),
}));
