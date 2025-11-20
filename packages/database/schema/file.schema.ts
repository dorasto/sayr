import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
export const fileVisibilityEnum = v.pgEnum("file_visibility", ["public", "private"]);
export const file = table("file", {
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
	visibility: fileVisibilityEnum("visibility").notNull(),
	type: v.text("type"),
});

export type fileType = typeof file.$inferSelect;

export const filenRelations = relations(file, ({ one }) => ({
	user: one(user, {
		fields: [file.userId],
		references: [user.id],
	}),
}));
