import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";

export const category = table("category", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	name: v.varchar("name").notNull(),
	color: v.varchar("color").default("hsla(0, 0%, 0%, 1)"),
	icon: v.text("icon"),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
});

export type categoryType = typeof category.$inferSelect;

export const categoryRelations = relations(category, ({ one }) => ({
	organization: one(organization, {
		fields: [category.organizationId],
		references: [organization.id],
	}),
}));
