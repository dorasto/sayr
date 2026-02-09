import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { task } from "./task.schema";
import { taskCommentReaction, type NodeJSON } from ".";
export const taskCommentVisibilityEnum = v.pgEnum("task_comment_visibility", ["public", "internal"]);
export const taskCommentSourceEnum = v.pgEnum(
	"task_comment_source",
	["sayr", "github"]
);
export const taskComment = table(
	"task_comment",
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
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
		content: v.jsonb("content").$type<NodeJSON>(),
		createdBy: v.text("created_by").references(() => user.id),
		visibility: taskCommentVisibilityEnum("visibility").notNull().default("public"),
		// ✅ Source of comment
		source: taskCommentSourceEnum("source")
			.notNull()
			.default("sayr"),

		// ✅ External author metadata (GitHub, etc.)
		externalAuthorLogin: v.text("external_author_login"),
		externalAuthorUrl: v.text("external_author_url"),
		// ✅ External GitHub identifiers
		externalIssueNumber: v.integer("external_issue_number"),
		externalCommentId: v.bigint("external_comment_id", {
			mode: "number",
		}),
		externalCommentUrl: v.text("external_comment_url"),
	},
	(t) => [
		v.index("idx_task_comment_task").on(t.organizationId, t.taskId, t.createdAt),
		v.index("idx_task_comment_creator").on(t.createdBy),
		v.index("idx_task_comment_external_author").on(
			t.externalAuthorLogin
		),
	]
);

export type taskCommentType = typeof taskComment.$inferSelect;

export const taskCommentRelations = relations(taskComment, ({ one, many }) => ({
	task: one(task, {
		fields: [taskComment.taskId],
		references: [task.id],
	}),
	organization: one(organization, {
		fields: [taskComment.organizationId],
		references: [organization.id],
	}),
	createdBy: one(user, {
		fields: [taskComment.createdBy],
		references: [user.id],
	}),
	reactions: many(taskCommentReaction), // 👈 all reactions for this comment
}));
