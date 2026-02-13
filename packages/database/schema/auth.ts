import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
// --------------------
// User
// --------------------
export const user = table("user", {
	id: v.text("id").primaryKey(),
	name: v.text("name").notNull(),
	displayName: v.text("display_name"),
	email: v.text("email").notNull().unique(),
	emailVerified: v
		.boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: v.text("image"),
	createdAt: v
		.timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: v
		.timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
	role: v.text("role"),
	banned: v.boolean("banned"),
	banReason: v.text("ban_reason"),
	banExpires: v.timestamp("ban_expires"),
});

// --------------------
// Session
// --------------------
export const session = table("session", {
	id: v.text("id").primaryKey(),
	expiresAt: v.timestamp("expires_at").notNull(),
	token: v.text("token").notNull().unique(),
	createdAt: v.timestamp("created_at").notNull(),
	updatedAt: v.timestamp("updated_at").notNull(),
	ipAddress: v.text("ip_address"),
	userAgent: v.text("user_agent"),
	userId: v
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	impersonatedBy: v.text("impersonated_by"),
});

// --------------------
// Account
// --------------------
export const account = table("account", {
	id: v.text("id").primaryKey(),
	accountId: v.text("account_id").notNull(),
	providerId: v.text("provider_id").notNull(),
	userId: v
		.text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: v.text("access_token"),
	refreshToken: v.text("refresh_token"),
	idToken: v.text("id_token"),
	accessTokenExpiresAt: v.timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: v.timestamp("refresh_token_expires_at"),
	scope: v.text("scope"),
	password: v.text("password"),
	createdAt: v.timestamp("created_at").notNull(),
	updatedAt: v.timestamp("updated_at").notNull(),
});

// --------------------
// Verification
// --------------------
export const verification = table("verification", {
	id: v.text("id").primaryKey(),
	identifier: v.text("identifier").notNull(),
	value: v.text("value").notNull(),
	expiresAt: v.timestamp("expires_at").notNull(),
	createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: v.timestamp("updated_at").$defaultFn(() => new Date()),
});
