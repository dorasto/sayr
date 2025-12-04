import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

type viewConfig = {
	mode: "list" | "kanban";
	groupBy: "status" | "priority" | "assignee" | "category";
	showCompletedTasks: boolean;
	showEmptyGroups: boolean;
	color?: string;
	icon?: string;
};

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
	slug: v.text("slug"),
	logo: v.text("logo"),
	filterParams: v.text("filter_params").notNull(),
	viewConfig: v.jsonb("view_config").$type<viewConfig>().default({
		mode: "list",
		groupBy: "status",
		showCompletedTasks: true,
		showEmptyGroups: true,
	}),
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
