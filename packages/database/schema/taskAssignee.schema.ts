import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { project } from "./project.schema";
import { task } from "./task.schema";

// A join table to assign multiple users to a single task
export const taskAssignee = table("task_assignee", {
	taskId: v
		.text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "cascade" }),
	projectId: v
		.text("project_id")
		.notNull()
		.references(() => project.id, { onDelete: "cascade" }),
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
	project: one(project, {
		fields: [taskAssignee.projectId],
		references: [project.id],
	}),
	user: one(user, {
		fields: [taskAssignee.userId],
		references: [user.id],
	}),
}));
