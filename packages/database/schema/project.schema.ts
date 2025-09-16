import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { member } from "./member.schema";
import { organization } from "./organization.schema";
import { task } from "./task.schema";

export const project = pgTable("project", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	organization: text("organization_id").references(() => organization.id),
	description: text("description").default(""),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
	visibility: text("visibility").default("public"), // public or private. Sets if the entire project is visible to the public or only to members.
	tags: text("tags").array().default([]), // array of strings in "tag-name" format usable for filtering and categorization available to tasks within the project
	/////////////////////
	// other fields to do
	/////////////////////
	// releaseCycle: text("release_cycle").default(""), // e.g. "sprint-1", "v1.0", etc. Used to group tasks within a project for a specific release cycle.
	// roles: Allow organizations to define roles within a project (e.g., "developer", "designer", "manager") and assign members to these roles. Roles can have specific permissions associated with them.
	// permissions: JSONB column to define granular permissions for members or roles within the project (e.g., who can create tasks, who can delete tasks, etc.).
});

export type projectType = typeof project.$inferSelect;

export const projectRelations = relations(project, ({ many }) => ({
	members: many(member),
	tasks: many(task),
}));
