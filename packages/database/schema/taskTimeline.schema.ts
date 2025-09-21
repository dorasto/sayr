import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { project } from "./project.schema";
import { task } from "./task.schema";

export const timelineEventTypeEnum = v.pgEnum("timeline_event_type", [
	"status_change",
	"priority_change",
	"comment",
	"label_added",
	"label_removed",
	"assignee_added",
	"assignee_removed",
	"created",
	"updated",
]);

export const taskTimeline = table(
	"task_timeline",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		timelineNumber: v.integer("timeline_number").notNull(), // 👈 per-task sequential
		taskId: v
			.text("task_id")
			.notNull()
			.references(() => task.id, { onDelete: "cascade" }),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		projectId: v
			.text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		actorId: v.text("actor_id").references(() => user.id),
		eventType: timelineEventTypeEnum("event_type").notNull(),
		fromValue: v.jsonb("from_value"),
		toValue: v.jsonb("to_value"),
		blockNote: v.jsonb("block_note"),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => ({
		uniqueTaskTimelineNum: v.unique().on(t.taskId, t.timelineNumber),
	})
);

export type taskTimelineType = typeof taskTimeline.$inferSelect;

export const taskTimelineRelations = relations(taskTimeline, ({ one }) => ({
	task: one(task, {
		fields: [taskTimeline.taskId],
		references: [task.id],
	}),
	organization: one(organization, {
		fields: [taskTimeline.organizationId],
		references: [organization.id],
	}),
	project: one(project, {
		fields: [taskTimeline.projectId],
		references: [project.id],
	}),
	actor: one(user, {
		fields: [taskTimeline.actorId],
		references: [user.id],
	}),
}));
