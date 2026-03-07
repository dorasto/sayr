import crypto from "node:crypto";
import { relations, sql } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { member } from "./member.schema";

/**
 * Organization-level preferences stored as JSONB.
 * All flags default to `true` so existing orgs keep current behaviour.
 */
export interface OrganizationSettings {
	/** When false, users without privileges cannot comment on or modify closed tasks. */
	allowActionsOnClosedTasks: boolean;
	/** When false, external users cannot comment on or create tasks (voting remains open). */
	publicActions: boolean;
	/** When false, the organization's public page is disabled entirely. */
	enablePublicPage: boolean;
}

/** Sensible defaults — everything enabled so nothing breaks for existing orgs. */
export const defaultOrganizationSettings: OrganizationSettings = {
	allowActionsOnClosedTasks: true,
	publicActions: true,
	enablePublicPage: true,
};

export const organization = table("organization", {
	id: v.text("id").primaryKey(),
	name: v.text("name").notNull(),
	slug: v.text("slug").notNull(),
	logo: v.text("logo"),
	bannerImg: v.text("banner_img"),
	description: v.text("description").default("").notNull(),
	settings: v
		.json("settings")
		.$type<OrganizationSettings>()
		.notNull()
		.default(defaultOrganizationSettings),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
	privateId: v.text("private_id").$defaultFn(() => generatePrivateId()),
	plan: v.text("plan").default("free"),
	seatCount: v.integer("seat_count").default(5),
	polarCustomerId: v.text("polar_customer_id"),
	polarSubscriptionId: v.text("polar_subscription_id"),
	currentPeriodEnd: v.timestamp("current_period_end"),
	isSystemOrg: v.boolean("is_system_org").default(false).notNull(),
	shortId: v.text("short_id").default("SAY").notNull(),
	createdBy: v.text("created_by"),
}, (t) => [
	v
		.uniqueIndex("one_system_org_only")
		.on(t.isSystemOrg)
		.where(sql`is_system_org = true`),
	v.index("idx_org_created_by").on(t.createdBy)
]);

export type organizationType = typeof organization.$inferSelect;

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
}));

function generatePrivateId(): string {
	// Mix strong entropy sources
	const randomPart = crypto.randomBytes(64);
	const timeEntropy = Buffer.from(`${Date.now()}-${Math.random()}`);

	// HMAC provides keyed randomness for additional unpredictability
	const id = crypto
		.createHmac("sha512", crypto.randomBytes(32))
		.update(randomPart)
		.update(timeEntropy)
		.digest("base64url");

	// Optionally truncate to keep it manageable for URLs or DB storage
	return id.slice(0, 43); // 256-bit hash ≈ 43 chars in base64url
}
