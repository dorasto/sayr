import { relations } from "drizzle-orm";
import * as v from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization.schema";

/**
 * ────────────────────────────────
 *  TEAMS — per organization
 * ────────────────────────────────
 */
export const team = table(
	"team",
	{
		id: v.text("id").primaryKey(),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: v.text("name").notNull(),
		description: v.text("description"),
		permissions: v
			.json("permissions")
			.$type<{
				administrator: boolean;
				members: boolean;
				teams: boolean;
				categories: boolean;
				labels: boolean;
			}>()
			.notNull()
			.default({
				administrator: false,
				members: false,
				teams: false,
				categories: false,
				labels: false,
			}),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v
			.timestamp("updated_at")
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(t) => [v.index("idx_team_org_name").on(t.organizationId, t.name)]
);

/**
 * ────────────────────────────────
 *  MEMBER — user membership in org
 * ────────────────────────────────
 */
export const member = table(
	"member",
	{
		id: v.text("id").primaryKey(),
		userId: v
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		organizationId: v
			.text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
	},
	(t) => [v.unique("unq_member_org_user").on(t.userId, t.organizationId)]
);

/**
 * ────────────────────────────────
 *  MEMBER ↔ TEAM (many–to–many)
 * ────────────────────────────────
 */
export const memberTeam = table(
	"member_team",
	{
		id: v.text("id").primaryKey(),
		memberId: v
			.text("member_id")
			.notNull()
			.references(() => member.id, { onDelete: "cascade" }),
		teamId: v
			.text("team_id")
			.notNull()
			.references(() => team.id, { onDelete: "cascade" }),
	},
	(t) => [v.unique("unq_member_team").on(t.memberId, t.teamId)]
);

/**
 * ────────────────────────────────
 *  RELATIONS
 * ────────────────────────────────
 */
export const memberRelations = relations(member, ({ one, many }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
	// a member can be linked to many memberTeam entries
	teams: many(memberTeam),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
	organization: one(organization, {
		fields: [team.organizationId],
		references: [organization.id],
	}),
	// team -> memberTeam links
	members: many(memberTeam),
}));

// ✅ now describe how the join table connects both sides
export const memberTeamRelations = relations(memberTeam, ({ one }) => ({
	member: one(member, {
		fields: [memberTeam.memberId],
		references: [member.id],
	}),
	team: one(team, {
		fields: [memberTeam.teamId],
		references: [team.id],
	}),
}));
/**
 * ────────────────────────────────
 *  TYPES
 * ────────────────────────────────
 */

// a single team row
export type OrganizationTeamType = typeof team.$inferSelect;

// a single member row
export type OrganizationMemberType = typeof member.$inferSelect;

// a single member-team join row
export type OrganizationMemberTeamType = typeof memberTeam.$inferSelect;

export type OrganizationTeamWithMembersType = OrganizationTeamType & {
	members: Array<
		OrganizationMemberTeamType & {
			member: OrganizationMemberType;
		}
	>;
};
