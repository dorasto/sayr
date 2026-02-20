import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { task } from "./task.schema";
import { taskTimeline } from "./taskTimeline.schema";

export const notificationTypeEnum = v.pgEnum("notification_type", [
	"mention",
	"status_change",
	"priority_change",
	"assignee_added",
	"assignee_removed",
	"comment",
]);

export const notification = table(
	"notification",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		actorId: v.text("actor_id").references(() => user.id),
		taskId: v
			.text("task_id")
			.notNull()
			.references(() => task.id, { onDelete: "cascade" }),
		timelineEventId: v.text("timeline_event_id").references(() => taskTimeline.id, { onDelete: "set null" }),
		type: notificationTypeEnum("type").notNull(),
		read: v.boolean("read").default(false).notNull(),
		archived: v.boolean("archived").default(false).notNull(),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [
		v.index("idx_notification_user").on(t.userId, t.read, t.createdAt),
		v.index("idx_notification_user_org").on(t.userId, t.organizationId, t.createdAt),
		v.index("idx_notification_task").on(t.taskId),
	],
);

export type notificationType = typeof notification.$inferSelect;

export const notificationRelations = relations(notification, ({ one }) => ({
	organization: one(organization, {
		fields: [notification.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [notification.userId],
		references: [user.id],
		relationName: "notificationRecipient",
	}),
	actor: one(user, {
		fields: [notification.actorId],
		references: [user.id],
		relationName: "notificationActor",
	}),
	task: one(task, {
		fields: [notification.taskId],
		references: [task.id],
	}),
	timelineEvent: one(taskTimeline, {
		fields: [notification.timelineEventId],
		references: [taskTimeline.id],
	}),
}));
