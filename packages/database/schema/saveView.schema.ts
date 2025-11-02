import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

export const savedView = table("saved_view", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	createdById: v.text("created_by_id").references(() => user.id),
	name: v.text("name").notNull(),
	filterParams: v.text("filter_params").notNull(),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});

export type savedViewType = typeof savedView.$inferSelect;

export const savedViewRelations = relations(savedView, ({ one }) => ({
	organization: one(organization, {
		fields: [savedView.organizationId],
		references: [organization.id],
	}),
	creator: one(user, {
		fields: [savedView.createdById],
		references: [user.id],
	}),
}));
