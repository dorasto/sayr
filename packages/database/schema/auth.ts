import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
	twoFactorEnabled: v.boolean("two_factor_enabled"),
	lastLoginMethod: v.text("last_login_method"),
});

export const two_factor = table("twoFactor", {
	id: v.text("id").primaryKey(),
	userId: v.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	secret: v.text("secret"),
	backupCodes: v.text("backup_codes"),
	verified: v.boolean("verified").default(true),
	failedVerificationCount: v.integer("failed_verification_count").default(0),
	lockedUntil: v.timestamp("locked_until"),
},
	(table) => [
		v.index("twoFactor_secret_idx").on(table.secret),
		v.index("twoFactor_userId_idx").on(table.userId),
	],
);

export const passkey = table("passkey", {
	id: v.text("id").primaryKey(),
	name: v.text("name"),
	publicKey: v.text("public_key").notNull(),
	userId: v.text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	credentialID: v.text("credential_id").notNull(),
	counter: v.integer("counter").notNull(),
	deviceType: v.text("device_type").notNull(),
	backedUp: v.boolean("backed_up").notNull(),
	transports: v.text("transports"),
	createdAt: v.timestamp("created_at", { precision: 6, withTimezone: true }),
	aaguid: v.text("aaguid"),
},
	(table) => [
		v.index("passkey_userId_idx").on(table.userId),
		v.index("passkey_credentialID_idx").on(table.credentialID),
	],
);
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
},
	(table) => [v.index("session_userId_idx").on(table.userId)],
);

// --------------------
// Account
// --------------------
export const account = table("account", {
	id: v.text("id").primaryKey(),
	issuer: v.text("issuer").notNull(),
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
},
	(table) => [
		v.uniqueIndex("account_issuer_accountId_uidx").on(
			table.issuer,
			table.accountId,
		),
		v.index("account_userId_idx").on(table.userId),
	],
);

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
},
	(table) => [v.index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(two_factor),
	passkeys: many(passkey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const twoFactorRelations = relations(two_factor, ({ one }) => ({
	user: one(user, {
		fields: [two_factor.userId],
		references: [user.id],
	}),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));
