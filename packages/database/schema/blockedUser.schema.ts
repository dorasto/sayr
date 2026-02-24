import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

/**
 * ────────────────────────────────
 *  BLOCKED USER — per organization
 * ────────────────────────────────
 *
 * Tracks users that an organization has blocked from interacting
 * with their tasks (comments, votes, reactions, etc.).
 * These are external users (non-members) who've previously
 * interacted with the organization's public tasks.
 */
export const blockedUser = table(
	"blocked_user",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		blockedBy: v
			.text("blocked_by")
			.notNull()
			.references(() => user.id, { onDelete: "no action" }),
		reason: v.text("reason"),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.unique("unq_blocked_user_org").on(t.organizationId, t.userId),
		v.index("idx_blocked_user_org").on(t.organizationId),
	],
);

/**
 * ────────────────────────────────
 *  RELATIONS
 * ────────────────────────────────
 */
export const blockedUserRelations = relations(blockedUser, ({ one }) => ({
	organization: one(organization, {
		fields: [blockedUser.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [blockedUser.userId],
		references: [user.id],
		relationName: "blockedUser",
	}),
	blockedByUser: one(user, {
		fields: [blockedUser.blockedBy],
		references: [user.id],
		relationName: "blockedByUser",
	}),
}));

/**
 * ────────────────────────────────
 *  TYPES
 * ────────────────────────────────
 */
export type blockedUserType = typeof blockedUser.$inferSelect;
