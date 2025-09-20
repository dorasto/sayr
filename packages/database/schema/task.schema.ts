import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
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
	visible: visibleEnum("visible").default("public"), // enum-like field
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	title: v.text("title"),
	description: v.jsonb("description").default([]),
	status: statusEnum("todo"),
	priority: priorityEnum("none"),
});

export type taskType = typeof task.$inferSelect;

export const taskRelations = relations(task, ({ one, many }) => ({
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id],
	}),
	project: one(project, {
		fields: [task.projectId],
		references: [project.id],
	}),
	comments: many(taskComment),
	labels: many(taskLabelAssignment),
}));
