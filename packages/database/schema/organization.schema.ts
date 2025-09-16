import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { member } from "./member.schema";
import { task } from "./task.schema";

export const organization = table("organization", {
	id: v.text("id").primaryKey(),
	name: v.text("name").notNull(),
	slug: v.text("slug").notNull(),
	logo: v.text("logo"),
	bannerImg: v.text("banner_img"),
	description: v.text("description").default(""),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});

export type organizationType = typeof organization.$inferSelect;

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	tasks: many(task),
}));
