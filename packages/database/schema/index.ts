import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { type account, type session, user, type verification } from "./auth";

/* -------------------------------------------------------------------------- */
/*                               Organization                                 */
/* -------------------------------------------------------------------------- */

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
}));

/* -------------------------------------------------------------------------- */
/*                             Organization Member                            */
/* -------------------------------------------------------------------------- */

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

export type memberType = typeof member.$inferSelect;

export interface OrganizationWithMembers extends organizationType {
	members: (memberType & { user: userType })[];
}

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

/* -------------------------------------------------------------------------- */
/*                             Organization Task                              */
/* -------------------------------------------------------------------------- */

export const task = pgTable("task", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	visible: text("visible").default("private").notNull(), // "public" or "private"
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

export type taskType = typeof task.$inferSelect;

export const taskRelations = relations(task, ({ one, many }) => ({
	organization: one(organization, {
		fields: [task.organizationId],
		references: [organization.id],
	}),
	comments: many(taskComment),
}));

/* -------------------------------------------------------------------------- */
/*                           Task Comment                                     */
/* -------------------------------------------------------------------------- */

export const taskComment = pgTable("task_comment", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	taskId: uuid("task_id").references(() => task.id, {
		onDelete: "cascade",
	}),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

export type taskCommentType = typeof taskComment.$inferSelect;

export const taskCommentRelations = relations(taskComment, ({ one }) => ({
	task: one(task, {
		fields: [taskComment.taskId],
		references: [task.id],
	}),
	organization: one(organization, {
		fields: [taskComment.organizationId],
		references: [organization.id],
	}),
}));

/* -------------------------------------------------------------------------- */
/*                               Auth Types                                   */
/* -------------------------------------------------------------------------- */

export type userType = typeof user.$inferSelect;
export type sessionType = typeof session.$inferSelect;
export type accountType = typeof account.$inferSelect;
export type verificationType = typeof verification.$inferSelect;
