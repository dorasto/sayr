import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

export const member = table("member", {
	id: v.text("id").primaryKey(),
	userId: v
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: v.text("role").notNull(),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
});

export type memberType = typeof member.$inferSelect;

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));
