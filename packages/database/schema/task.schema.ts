import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization } from "./organization.schema";
import { taskComment } from "./taskComment.schema";

export const task = pgTable("task", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	visible: text("visible").default("private").notNull(), // enum-like field
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
