import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { release } from "./release.schema";
import { releaseStatusUpdate } from "./release_status_update.schema";
import { releaseCommentReaction } from "./release_comment_reaction.schema";
import type { NodeJSON } from ".";

export const releaseCommentVisibilityEnum = v.pgEnum("release_comment_visibility", [
	"public",
	"internal",
]);

export const releaseComment = table(
	"release_comment",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		releaseId: v
			.text("release_id")
			.notNull()
			.references(() => release.id, { onDelete: "cascade" }),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// null = comment on the release itself; set = comment on a specific status update
		statusUpdateId: v
			.text("status_update_id")
			.references(() => releaseStatusUpdate.id, { onDelete: "cascade" }),
		createdBy: v.text("created_by").references(() => user.id, { onDelete: "set null" }),
		content: v.jsonb("content").$type<NodeJSON>(),
		visibility: releaseCommentVisibilityEnum("visibility").notNull().default("public"),
		// Single-level threading: null = top-level, set = reply to parent
		parentId: v.text("parent_id"),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.index("idx_release_comment_release").on(t.releaseId, t.createdAt),
		v.index("idx_release_comment_status_update").on(t.statusUpdateId, t.createdAt),
		v.index("idx_release_comment_org").on(t.organizationId, t.createdAt),
		v.index("idx_release_comment_creator").on(t.createdBy),
		v.index("idx_release_comment_parent").on(t.parentId),
		v.foreignKey({
			columns: [t.parentId],
			foreignColumns: [t.id],
			name: "release_comment_parent_fk",
		}).onDelete("cascade"),
	]
);

export type releaseCommentType = typeof releaseComment.$inferSelect;

export const releaseCommentRelations = relations(releaseComment, ({ one, many }) => ({
	release: one(release, {
		fields: [releaseComment.releaseId],
		references: [release.id],
	}),
	organization: one(organization, {
		fields: [releaseComment.organizationId],
		references: [organization.id],
	}),
	statusUpdate: one(releaseStatusUpdate, {
		fields: [releaseComment.statusUpdateId],
		references: [releaseStatusUpdate.id],
	}),
	createdBy: one(user, {
		fields: [releaseComment.createdBy],
		references: [user.id],
	}),
	reactions: many(releaseCommentReaction),
	parent: one(releaseComment, {
		fields: [releaseComment.parentId],
		references: [releaseComment.id],
		relationName: "releaseCommentThread",
	}),
	replies: many(releaseComment, {
		relationName: "releaseCommentThread",
	}),
}));
