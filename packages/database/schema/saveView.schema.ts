import crypto from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

type viewConfig = {
	mode: "list" | "kanban";
	groupBy: "status" | "priority" | "assignee" | "category";
	subGroupBy?: "status" | "priority" | "assignee" | "category" | "none";
	showCompletedTasks: boolean;
	sortBy?: "priority" | "voteCount" | "createdAt" | "updatedAt" | "status" | "none";
	sortDirection?: "asc" | "desc";
	color?: string;
	icon?: string;
};

export const savedView = table(
	"saved_view",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		// Nullable: null organizationId = a personal (cross-org) view owned by createdById.
		// Every existing org-scoped read/write path scopes by eq/inArray(organizationId, <concrete id>),
		// which never matches a null row, so this is safe for existing org-view behavior.
		organizationId: v.text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
		// For personal views (organizationId null) this must always be set by the app layer — it's the owner.
		createdById: v.text("created_by_id").references(() => user.id),
		name: v.text("name").notNull(),
		slug: v.text("slug"),
		logo: v.text("logo"),
		filterParams: v.text("filter_params").notNull(),
		viewConfig: v.jsonb("view_config").$type<viewConfig>().default({
			mode: "list",
			groupBy: "status",
			showCompletedTasks: true,
		}),
		pinned: v.boolean("pinned").notNull().default(false),
		position: v.integer("position").notNull().default(0),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	},
	(t) => [v.index("idx_saved_view_creator_personal").on(t.createdById, t.pinned, t.position)]
);

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
