import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category } from "./category.schema";
import { label } from "./label.schema";
import { organization } from "./organization.schema";
import { NodeJSON } from ".";

export const issueTemplate = table("task_template", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	name: v.varchar("name", { length: 100 }).notNull(),
	titlePrefix: v.varchar("title_prefix", { length: 50 }),
	description: v.jsonb("description").$type<NodeJSON>(),
	status: v.text("status"),
	priority: v.text("priority"),
	categoryId: v.text("category_id").references(() => category.id, { onDelete: "set null" }),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});

export type issueTemplateType = typeof issueTemplate.$inferSelect;

export const issueTemplateLabel = table("task_template_label", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	templateId: v
		.text("template_id")
		.notNull()
		.references(() => issueTemplate.id, { onDelete: "cascade" }),
	labelId: v
		.text("label_id")
		.notNull()
		.references(() => label.id, { onDelete: "cascade" }),
});

export type issueTemplateLabelType = typeof issueTemplateLabel.$inferSelect;

export const issueTemplateAssignee = table("task_template_assignee", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	templateId: v
		.text("template_id")
		.notNull()
		.references(() => issueTemplate.id, { onDelete: "cascade" }),
	userId: v
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export type issueTemplateAssigneeType = typeof issueTemplateAssignee.$inferSelect;

export const taskTemplateRelations = relations(issueTemplate, ({ one, many }) => ({
	organization: one(organization, {
		fields: [issueTemplate.organizationId],
		references: [organization.id],
	}),
	category: one(category, {
		fields: [issueTemplate.categoryId],
		references: [category.id],
	}),
	labels: many(issueTemplateLabel),
	assignees: many(issueTemplateAssignee),
}));

export const taskTemplateLabelRelations = relations(issueTemplateLabel, ({ one }) => ({
	template: one(issueTemplate, {
		fields: [issueTemplateLabel.templateId],
		references: [issueTemplate.id],
	}),
	label: one(label, {
		fields: [issueTemplateLabel.labelId],
		references: [label.id],
	}),
}));

export const taskTemplateAssigneeRelations = relations(issueTemplateAssignee, ({ one }) => ({
	template: one(issueTemplate, {
		fields: [issueTemplateAssignee.templateId],
		references: [issueTemplate.id],
	}),
	user: one(user, {
		fields: [issueTemplateAssignee.userId],
		references: [user.id],
	}),
}));
