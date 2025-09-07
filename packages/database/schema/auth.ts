import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// --------------------
// User
// --------------------
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => new Date())
		.notNull(),
	role: text("role"),
	banned: boolean("banned"),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires"),
});

// --------------------
// Session
// --------------------
export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	impersonatedBy: text("impersonated_by"),

	// Organization plugin additions
	activeOrganizationId: text("active_organization_id"),
	activeTeamId: text("active_team_id"),
});

// --------------------
// Account
// --------------------
export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

// --------------------
// Verification
// --------------------
export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// --------------------
// Organization
// --------------------
export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull(),
	logo: text("logo"),
	bannerImg: text("banner_img"),
	metadata: jsonb("metadata").default({}),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// --------------------
// Member
// --------------------
export const member = pgTable("member", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

// --------------------
// Invitation
// --------------------
export const invitation = pgTable("invitation", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	inviterId: text("inviter_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	status: text("status").notNull(),
	expiresAt: timestamp("expires_at").notNull(),

	// Optional if teams are enabled
	teamId: text("team_id"),
});

// --------------------
// Team (optional)
// --------------------
export const team = pgTable("team", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// --------------------
// Team Member (optional)
// --------------------
export const teamMember = pgTable("team_member", {
	id: text("id").primaryKey(),
	teamId: text("team_id")
		.notNull()
		.references(() => team.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});
