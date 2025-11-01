import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
export const assetVisibilityEnum = v.pgEnum("asset_visibility", ["public", "private"]);
export const asset = table("asset", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizationId: v.text("organization_id").references(() => organization.id, { onDelete: "set null" }),
	fileName: v.text("file_name").notNull(),
	url: v.text("url").notNull(),
	userId: v.text("user_id").references(() => user.id, { onDelete: "set null" }),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	visibility: assetVisibilityEnum("visibility").notNull(),
});

export type assetType = typeof asset.$inferSelect;

export const assetnRelations = relations(asset, ({ one }) => ({
	user: one(user, {
		fields: [asset.userId],
		references: [user.id],
	}),
}));
