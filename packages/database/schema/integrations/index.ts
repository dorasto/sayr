import { randomUUID } from "node:crypto";
import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { organization } from "../organization.schema";

export const integrationConfig = table("integration_config", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	integrationId: v.varchar("integration_id", { length: 100 }).notNull(),
	key: v.varchar("key", { length: 255 }).notNull(),
	value: v.jsonb("value"),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
}, (t) => [
	v.uniqueIndex("integration_config_org_integration_key_unique").on(t.organizationId, t.integrationId, t.key),
	v.index("integration_config_org_integration_idx").on(t.organizationId, t.integrationId),
]);

export type integrationConfigType = typeof integrationConfig.$inferSelect;
export type integrationConfigInsert = typeof integrationConfig.$inferInsert;

export const integrationConfigRelations = relations(integrationConfig, ({ one }) => ({
	organization: one(organization, {
		fields: [integrationConfig.organizationId],
		references: [organization.id],
	}),
}));

export const integrationStorage = table("integration_storage", {
	id: v
		.text("id")
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	organizationId: v
		.text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	integrationId: v.varchar("integration_id", { length: 100 }).notNull(),
	data: v.jsonb("data").notNull(),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
}, (t) => [
	v.index("integration_storage_org_integration_idx").on(t.organizationId, t.integrationId),
]);

export type integrationStorageType = typeof integrationStorage.$inferSelect;
export type integrationStorageInsert = typeof integrationStorage.$inferInsert;

export const integrationStorageRelations = relations(integrationStorage, ({ one }) => ({
	organization: one(organization, {
		fields: [integrationStorage.organizationId],
		references: [organization.id],
	}),
}));
