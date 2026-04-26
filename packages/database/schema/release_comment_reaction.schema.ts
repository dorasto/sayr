import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { releaseComment } from "./release_comment.schema";

export const releaseCommentReaction = table(
	"release_comment_reaction",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		commentId: v
			.text("comment_id")
			.notNull()
			.references(() => releaseComment.id, { onDelete: "cascade" }),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// Reaction type stored as raw emoji string
		emoji: v.text("emoji").notNull(),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.uniqueIndex("uniq_release_comment_reaction").on(t.commentId, t.userId, t.emoji),
		v.index("idx_release_comment_reaction_comment").on(t.commentId),
		v.index("idx_release_comment_reaction_org").on(t.organizationId),
	]
);

export type releaseCommentReactionType = typeof releaseCommentReaction.$inferSelect;

export const releaseCommentReactionRelations = relations(releaseCommentReaction, ({ one }) => ({
	comment: one(releaseComment, {
		fields: [releaseCommentReaction.commentId],
		references: [releaseComment.id],
	}),
	organization: one(organization, {
		fields: [releaseCommentReaction.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [releaseCommentReaction.userId],
		references: [user.id],
	}),
}));
