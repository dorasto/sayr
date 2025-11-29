import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

export const invite = table("invite", {
	id: v.text("id").primaryKey(),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	email: v.text("email").notNull(),
	userId: v.text("user_id").references(() => user.id, { onDelete: "set null" }),
	invitedById: v
		.text("invited_by_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	role: v.text("role").default("member").notNull(),
	inviteCode: v.text("invite_code").unique().notNull(),
	status: v.text("status").$type<"pending" | "accepted" | "declined" | "expired">().default("pending").notNull(),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	expiresAt: v.timestamp("expires_at"),
});

export type inviteType = typeof invite.$inferSelect;

export const inviteRelations = relations(invite, ({ one }) => ({
	organization: one(organization, {
		fields: [invite.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [invite.userId],
		references: [user.id],
	}),
	invitedBy: one(user, {
		fields: [invite.invitedById],
		references: [user.id],
	}),
}));
