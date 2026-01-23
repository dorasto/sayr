import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import type { NodeJSON } from ".";

export const releaseStatusEnum = v.pgEnum("release_status", [
	"planned",
	"in-progress",
	"released",
	"archived",
]);

export const release = table(
	"release",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: v.varchar("name").notNull(),
		slug: v.text("slug").notNull(),
		description: v.jsonb("description").$type<NodeJSON>(),
		status: releaseStatusEnum("status").default("planned").notNull(),
		targetDate: v.timestamp("target_date"),
		releasedAt: v.timestamp("released_at"),
		color: v.varchar("color").default("hsla(0, 0%, 0%, 1)"),
		icon: v.text("icon"),
		createdBy: v.text("created_by").references(() => user.id, { onDelete: "set null" }),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.index("idx_release_org_status").on(t.organizationId, t.status),
		v.index("idx_release_org_createdat").on(t.organizationId, t.createdAt),
		v.index("idx_release_org_targetdate").on(t.organizationId, t.targetDate),
		v.unique("release_organization_slug_unique").on(t.organizationId, t.slug),
	]
);

export type releaseType = typeof release.$inferSelect;

export const releaseRelations = relations(release, ({ one }) => ({
	organization: one(organization, {
		fields: [release.organizationId],
		references: [organization.id],
	}),
	createdBy: one(user, {
		fields: [release.createdBy],
		references: [user.id],
	}),
}));
