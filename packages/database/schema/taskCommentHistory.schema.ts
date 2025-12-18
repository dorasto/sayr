import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { task } from "./task.schema";
import { taskComment } from "./taskComment.schema";
import { user } from "./auth";
import type { NodeJSON } from ".";

export const taskCommentHistory = table(
	"task_comment_history",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		taskId: v.text("task_id").references(() => task.id, {
			onDelete: "cascade",
		}),
		commentId: v
			.text("comment_id")
			.notNull()
			.references(() => taskComment.id, { onDelete: "cascade" }),
		editedAt: v.timestamp("edited_at").$defaultFn(() => new Date()),
		editedBy: v.text("edited_by").references(() => user.id),
		content: v.jsonb("content").$type<NodeJSON>(),
	},
	(t) => [v.index("idx_task_comment_history_comment").on(t.organizationId, t.taskId, t.commentId, t.editedAt)]
);

export type taskCommentHistoryType = typeof taskCommentHistory.$inferSelect;

export const taskCommentHistoryRelations = relations(taskCommentHistory, ({ one }) => ({
	comment: one(taskComment, {
		fields: [taskCommentHistory.commentId],
		references: [taskComment.id],
	}),
	organization: one(organization, {
		fields: [taskCommentHistory.organizationId],
		references: [organization.id],
	}),
	task: one(task, {
		fields: [taskCommentHistory.taskId],
		references: [task.id],
	}),
	editedBy: one(user, {
		fields: [taskCommentHistory.editedBy],
		references: [user.id],
	}),
}));
