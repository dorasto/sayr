import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
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
	color: v.varchar("color").default("#cccccc"), // hex color (#RRGGBB)
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
});

export type labelType = typeof label.$inferSelect;

export const taskLabelAssignment = table("task_labels", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	taskId: v
		.text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
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
}));
