import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const taskComment = table("task_comment", {
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
	taskId: v.text("task_id").references(() => task.id, {
		onDelete: "cascade",
	}),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});

export type taskCommentType = typeof taskComment.$inferSelect;

export const taskCommentRelations = relations(taskComment, ({ one }) => ({
	task: one(task, {
		fields: [taskComment.taskId],
		references: [task.id],
	}),
	organization: one(organization, {
		fields: [taskComment.organizationId],
		references: [organization.id],
	}),
}));
