import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const taskRelationTypeEnum = v.pgEnum("task_relation_type", ["related", "blocking", "duplicate"]);

export const taskRelation = table(
	"task_relation",
	{
		id: v
			.text("id")
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		sourceTaskId: v
			.text("source_task_id")
			.notNull()
			.references(() => task.id, { onDelete: "cascade" }),
		targetTaskId: v
			.text("target_task_id")
			.notNull()
			.references(() => task.id, { onDelete: "cascade" }),
		type: taskRelationTypeEnum("type").notNull(),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		createdBy: v.text("created_by").references(() => user.id, { onDelete: "set null" }),
	},
	(t) => [
		v.index("idx_task_relation_source").on(t.sourceTaskId),
		v.index("idx_task_relation_target").on(t.targetTaskId),
		v.unique("task_relation_unique").on(t.sourceTaskId, t.targetTaskId, t.type),
	],
);

export type taskRelationType = typeof taskRelation.$inferSelect;

export const taskRelationRelations = relations(taskRelation, ({ one }) => ({
	organization: one(organization, {
		fields: [taskRelation.organizationId],
		references: [organization.id],
	}),
	sourceTask: one(task, {
		fields: [taskRelation.sourceTaskId],
		references: [task.id],
		relationName: "relationsAsSource",
	}),
	targetTask: one(task, {
		fields: [taskRelation.targetTaskId],
		references: [task.id],
		relationName: "relationsAsTarget",
	}),
	createdBy: one(user, {
		fields: [taskRelation.createdBy],
		references: [user.id],
	}),
}));
