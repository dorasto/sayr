import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { projectLabelAssignment } from "./label.schema";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const project = table("project", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => {
			return randomUUID();
		}),
	name: v.text("name").notNull(),
	organizationId: v.text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
	description: v.text("description").default(""),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	visibility: v.text("visibility").default("public"), // public or private. Sets if the entire project is visible to the public or only to members.
	/////////////////////
	// other fields to do
	/////////////////////
	// releaseCycle: text("release_cycle").default(""), // e.g. "sprint-1", "v1.0", etc. Used to group tasks within a project for a specific release cycle.
	// roles: Allow organizations to define roles within a project (e.g., "developer", "designer", "manager") and assign members to these roles. Roles can have specific permissions associated with them.
	// permissions: JSONB column to define granular permissions for members or roles within the project (e.g., who can create tasks, who can delete tasks, etc.).
});

export type projectType = typeof project.$inferSelect;

export const projectRelations = relations(project, ({ one, many }) => ({
	organization: one(organization, {
		fields: [project.organizationId],
		references: [organization.id],
	}),
	tasks: many(task),
	projectLabels: many(projectLabelAssignment),
}));
