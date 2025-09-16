import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { taskLabelAssignment } from "./label.schema";
import { organization } from "./organization.schema";
import { project } from "./project.schema";
import { taskComment } from "./taskComment.schema";
export const visibleEnum = v.pgEnum("visible", ["public", "private"]);

export const task = table("task", {
	id: v.uuid("id").primaryKey().defaultRandom(),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	projectId: v
		.text("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
	visible: visibleEnum("private"), // enum-like field
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});

export type taskType = typeof task.$inferSelect;

export const taskRelations = relations(task, ({ one, many }) => ({
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id],
	}),
	comments: many(taskComment),
	taskLabels: many(taskLabelAssignment), // 👈 relation to join table
}));
