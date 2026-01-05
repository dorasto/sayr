import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { taskComment } from "./taskComment.schema";
import { task } from "./task.schema";
import { organization } from "./organization.schema";

export const taskCommentReaction = table(
	"task_comment_reaction",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),

		// Foreign keys
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		taskId: v
			.text("task_id")
			.notNull()
			.references(() => task.id, { onDelete: "cascade" }),

		commentId: v
			.text("comment_id")
			.notNull()
			.references(() => taskComment.id, { onDelete: "cascade" }),

		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		// Reaction type (stored as raw emoji string)
		emoji: v.text("emoji").notNull(),

		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [
		// unique index ensures user can react once with a given emoji
		v
			.uniqueIndex("uniq_comment_reaction")
			.on(t.commentId, t.userId, t.emoji),

		// helpful lookup indexes
		v
			.index("idx_comment_reaction_comment")
			.on(t.commentId),
		v.index("idx_comment_reaction_task").on(t.taskId),
		v.index("idx_comment_reaction_org").on(t.organizationId),
	]
);

export type taskCommentReactionType = typeof taskCommentReaction.$inferSelect;

export const taskCommentReactionRelations = relations(taskCommentReaction, ({ one }) => ({
	comment: one(taskComment, {
		fields: [taskCommentReaction.commentId],
		references: [taskComment.id],
	}),
	task: one(task, {
		fields: [taskCommentReaction.taskId],
		references: [task.id],
	}),
	organization: one(organization, {
		fields: [taskCommentReaction.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [taskCommentReaction.userId],
		references: [user.id],
	}),
}));
