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
			.$type<TeamPermissions>()
			.notNull()
			.default({
				admin: {
					administrator: false,
					manageMembers: false,
					manageTeams: false,
					billing: false,
				},
				content: {
					manageCategories: false,
					manageLabels: false,
					manageViews: false,
					manageReleases: false,
				},
				tasks: {
					create: true,
					editAny: false,
					deleteAny: false,
					assign: false,
					changeStatus: true,
					changePriority: true,
				},
				moderation: {
					manageComments: false,
					approveSubmissions: false,
					manageVotes: false,
				},
			}),
		createdAt: v.timestamp("created_at").$defaultFn(() => new Date()),
		updatedAt: v
			.timestamp("updated_at")
			.notNull()
			.$defaultFn(() => new Date()),
		isSystem: v
			.boolean("is_system")
			.notNull()
			.default(false),
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
		seatAssignedId: v.text("seat_assigned_id"), // for Polar seat management
		seatAssigned: v.boolean("seat_assigned").notNull().default(false), // whether this member has been assigned a seat in Polar
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

/**
 * Team permissions structure - granular control over what team members can do.
 * Uses Discord-style permission inheritance: if ANY team grants a permission, user has it.
 */
export interface TeamPermissions {
	/** Organization-level administration */
	admin: {
		/** Full access - overrides all other permissions */
		administrator: boolean;
		/** Invite, remove, and manage organization members */
		manageMembers: boolean;
		/** Create, edit, and delete teams */
		manageTeams: boolean;
		/** Manage billing and subscription (if applicable) */
		billing: boolean;
	};
	/** Content and settings management */
	content: {
		/** Create, edit, and delete project categories */
		manageCategories: boolean;
		/** Create, edit, and delete labels */
		manageLabels: boolean;
		/** Create, edit, and delete saved views */
		manageViews: boolean;
		/** Create, edit, and delete releases */
		manageReleases: boolean;
	};
	/** Task/issue permissions */
	tasks: {
		/** Create new tasks */
		create: boolean;
		/** Edit any task (not just own/assigned) */
		editAny: boolean;
		/** Delete any task */
		deleteAny: boolean;
		/** Assign tasks to other members */
		assign: boolean;
		/** Change task status */
		changeStatus: boolean;
		/** Change task priority */
		changePriority: boolean;
	};
	/** Public-facing moderation permissions */
	moderation: {
		/** Edit or delete any comment */
		manageComments: boolean;
		/** Approve or reject public submissions */
		approveSubmissions: boolean;
		/** Manage votes (reset, fraud detection) */
		manageVotes: boolean;
	};
}

/** Default permissions for new teams */
export const defaultTeamPermissions: TeamPermissions = {
	admin: {
		administrator: false,
		manageMembers: false,
		manageTeams: false,
		billing: false,
	},
	content: {
		manageCategories: false,
		manageLabels: false,
		manageViews: false,
		manageReleases: false,
	},
	tasks: {
		create: true,
		editAny: false,
		deleteAny: false,
		assign: false,
		changeStatus: true,
		changePriority: true,
	},
	moderation: {
		manageComments: false,
		approveSubmissions: false,
		manageVotes: false,
	},
};

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
