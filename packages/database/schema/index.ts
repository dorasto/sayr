import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { type account, type session, user, type verification } from "./auth";

// --------------------
// Organization
// --------------------

export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull(),
	logo: text("logo"),
	bannerImg: text("banner_img"),
	description: text("description").default(""),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// --------------------
// Member
// --------------------
export const member = pgTable("member", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
export type organizationType = typeof organization.$inferSelect;
export type memberType = typeof member.$inferSelect;

export interface OrganizationWithMembers extends organizationType {
	members: (memberType & { user: userType })[];
}
