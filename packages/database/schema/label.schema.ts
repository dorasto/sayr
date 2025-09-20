import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { project } from "./project.schema";
import { task } from "./task.schema";

// Universal label (scoped to an organization)
export const label = table("label", {
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
	name: v.varchar("name", { length: 100 }).notNull(),
	color: v.varchar("color", { length: 7 }).default("#cccccc"), // hex color (#RRGGBB)
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
});

export type labelType = typeof label.$inferSelect;

export const projectLabelAssignment = table("project_labels", {
	projectId: v
		.text("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	labelId: v
		.text("label_id")
		.notNull()
		.references(() => label.id, { onDelete: "cascade" }),
});

export type projectLabelType = typeof projectLabelAssignment.$inferSelect;

export const taskLabelAssignment = table("task_labels", {
	taskId: v
		.text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),
	projectId: v
		.text("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	labelId: v
		.text("label_id")
		.notNull()
		.references(() => label.id, { onDelete: "cascade" }),
});

export type taskLabelType = typeof taskLabelAssignment.$inferSelect;

export const labelRelations = relations(label, ({ one, many }) => ({
	organization: one(organization, {
		fields: [label.organizationId],
		references: [organization.id],
	}),
	projectAssignments: many(projectLabelAssignment),
	taskAssignments: many(taskLabelAssignment),
}));

export const taskLabelRelations = relations(taskLabelAssignment, ({ one }) => ({
	task: one(task, {
		fields: [taskLabelAssignment.taskId],
		references: [task.id],
	}),
	label: one(label, {
		fields: [taskLabelAssignment.labelId],
		references: [label.id],
	}),
	project: one(project, {
		fields: [taskLabelAssignment.projectId],
		references: [project.id],
	}),
}));

export const projectLabelRelations = relations(projectLabelAssignment, ({ one }) => ({
	project: one(project, {
		fields: [projectLabelAssignment.projectId],
		references: [project.id],
	}),
	label: one(label, {
		fields: [projectLabelAssignment.labelId],
		references: [label.id],
	}),
}));
