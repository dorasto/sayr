import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { release } from "./release.schema";
import { releaseComment } from "./release_comment.schema";
import type { NodeJSON } from ".";

export const releaseUpdateHealthEnum = v.pgEnum("release_update_health", [
	"on_track",
	"at_risk",
	"off_track",
]);

export const releaseUpdateVisibilityEnum = v.pgEnum("release_update_visibility", [
	"public",
	"internal",
]);

export const releaseStatusUpdate = table(
	"release_status_update",
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
		authorId: v.text("author_id").references(() => user.id, { onDelete: "set null" }),
		content: v.jsonb("content").$type<NodeJSON>(),
		health: releaseUpdateHealthEnum("health").notNull().default("on_track"),
		visibility: releaseUpdateVisibilityEnum("visibility").notNull().default("public"),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.index("idx_release_status_update_release").on(t.releaseId, t.createdAt),
		v.index("idx_release_status_update_org").on(t.organizationId, t.createdAt),
		v.index("idx_release_status_update_author").on(t.authorId),
	]
);

export type releaseStatusUpdateType = typeof releaseStatusUpdate.$inferSelect;

export const releaseStatusUpdateRelations = relations(releaseStatusUpdate, ({ one, many }) => ({
	release: one(release, {
		fields: [releaseStatusUpdate.releaseId],
		references: [release.id],
	}),
	organization: one(organization, {
		fields: [releaseStatusUpdate.organizationId],
		references: [organization.id],
	}),
	author: one(user, {
		fields: [releaseStatusUpdate.authorId],
		references: [user.id],
	}),
	comments: many(releaseComment),
}));
