import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";

// --------------------
// API Key
// --------------------
export const apikey = table(
	"api_key",
	{
		id: v.text("id").primaryKey(),
		configId: v.text("config_id").default("default").notNull(),

		name: v.text("name"),
		start: v.text("start"),
		prefix: v.text("prefix"),
		referenceId: v.text("user_id").notNull(),

		// Hashed API key
		key: v.text("key").notNull(),
		refillInterval: v.integer("refill_interval"),
		refillAmount: v.integer("refill_amount"),
		lastRefillAt: v.timestamp("last_refill_at"),

		enabled: v
			.boolean("enabled")
			.$defaultFn(() => true)
			.notNull(),

		rateLimitEnabled: v
			.boolean("rate_limit_enabled")
			.$defaultFn(() => false)
			.notNull(),

		rateLimitTimeWindow: v.integer("rate_limit_time_window"),
		rateLimitMax: v.integer("rate_limit_max"),

		requestCount: v
			.integer("request_count")
			.$defaultFn(() => 0)
			.notNull(),

		remaining: v.integer("remaining"),
		lastRequest: v.timestamp("last_request"),

		expiresAt: v.timestamp("expires_at"),

		permissions: v.text("permissions"),
		metadata: v.jsonb("metadata"),

		createdAt: v
			.timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),

		updatedAt: v
			.timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(t) => [
		// 🔍 Fast lookup by hashed API key
		v
			.index("apikey_key_idx")
			.on(t.key),
		v.index("apikey_configId_idx").on(t.configId),
		v.index("apikey_referenceId_idx").on(t.referenceId),
		// ✅ Optional: enabled/disabled filtering
		v
			.index("apikey_enabled_idx")
			.on(t.enabled),
	]
);

export type ApikeyType = typeof apikey.$inferSelect;
