import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const taskComment = pgTable("task_comment", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	taskId: uuid("task_id").references(() => task.id, {
		onDelete: "cascade",
	}),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
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
