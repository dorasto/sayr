import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { taskLabelAssignment } from "./label.schema";
import { organization } from "./organization.schema";
import { taskAssignee } from "./taskAssignee.schema";
import { taskTimeline } from "./taskTimeline.schema";
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
	labels: many(taskLabelAssignment),
	assignees: many(taskAssignee),
	timeline: many(taskTimeline),
}));
