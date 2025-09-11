import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { member } from "./member.schema";
import { task } from "./task.schema";

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

export type organizationType = typeof organization.$inferSelect;

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	tasks: many(task),
}));
