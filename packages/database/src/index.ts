export * as auth from "../schema/auth";
export * as schema from "../schema/index";
export * from "./database";
export * from "./functions";

// Re-export team permissions types for convenience
export { type TeamPermissions, defaultTeamPermissions } from "../schema/member.schema";

// Re-export organization settings types for convenience
export { type OrganizationSettings, defaultOrganizationSettings } from "../schema/organization.schema";

import { and, eq, inArray } from "drizzle-orm";
import { member, memberTeam, team, defaultTeamPermissions as defaultPerms, type TeamPermissions } from "../schema";
import { user } from "../schema/auth";
import { db } from "./database";

/** Full admin permissions - all flags set to true (for platform admins) */
const fullPermissions: TeamPermissions = {
	admin: {
		administrator: true,
		manageMembers: true,
		manageTeams: true,
	},
	content: {
		manageCategories: true,
		manageLabels: true,
		manageViews: true,
	},
	tasks: {
		create: true,
		editAny: true,
		deleteAny: true,
		assign: true,
		changeStatus: true,
		changePriority: true,
	},
	moderation: {
		manageComments: true,
		approveSubmissions: true,
		manageVotes: true,
	},
};

/**
 * Checks if a user is a platform-level admin (god mode).
 * Platform admins bypass all org-level permission checks.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
	const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
	return u?.role === "admin" || u?.role === "system";
}

/**
 * Permission path type for nested permission structure.
 * E.g., "admin.administrator", "tasks.create", "moderation.manageComments"
 */
type PermissionPath =
	| `admin.${keyof TeamPermissions["admin"]}`
	| `content.${keyof TeamPermissions["content"]}`
	| `tasks.${keyof TeamPermissions["tasks"]}`
	| `moderation.${keyof TeamPermissions["moderation"]}`
	| "members";

/**
 * Determines whether a user has a specific organization-level permission.
 *
 * - Platform admins (user.role === 'admin') have god mode and bypass all checks.
 * - Evaluates across all teams the member belongs to within the org.
 * - "Administrator" grants full access to all permissions.
 * - Applies "most permissive wins" logic for shared roles.
 *
 * @param permPath - Dot-notation path like "admin.manageMembers" or "tasks.create"
 */
export async function hasOrgPermission(userId: string, orgId: string, permPath: PermissionPath): Promise<boolean> {
	// 0️⃣ Platform admin = god mode, bypass all checks
	if (await isPlatformAdmin(userId)) {
		return true;
	}

	// 1️⃣ Find membership for this org
	const [m] = await db
		.select({ id: member.id })
		.from(member)
		.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)));

	if (!m) return false;

	// ✅ Handle simple membership permission
	if (permPath === "members") {
		return true;
	}

	// 2️⃣ Get connected teams
	const joins = await db.select({ teamId: memberTeam.teamId }).from(memberTeam).where(eq(memberTeam.memberId, m.id));

	if (!joins.length) return false;

	const teamIds = joins.map((j) => j.teamId);

	// 3️⃣ Pull all team permission JSONs
	const teamsPerms = await db.select({ permissions: team.permissions }).from(team).where(inArray(team.id, teamIds));

	// 4️⃣ Administrator = full access override
	const isAdmin = teamsPerms.some((t) => t.permissions?.admin?.administrator);
	if (isAdmin) return true;

	// 5️⃣ Parse the permission path and check
	const [category, key] = permPath.split(".") as [keyof TeamPermissions, string];
	const allowed = teamsPerms.some((t) => {
		const perms = t.permissions as TeamPermissions | null;
		if (!perms || !perms[category]) return false;
		return (perms[category] as Record<string, boolean>)[key] === true;
	});

	return allowed;
}

/**
 * Builds a merged, organization-scoped permission object for a given user.
 *
 * - Platform admins (user.role === 'admin') get all permissions (god mode).
 * - Merges all team permissions belonging to the user's org membership.
 * - "Administrator" = full access to **all** permissions.
 * - "Most permissive wins" = any true flag across teams stays true.
 */
export async function getOrgPermissions(userId: string, orgId: string): Promise<TeamPermissions> {
	// 0️⃣ Platform admin = god mode, return full permissions
	if (await isPlatformAdmin(userId)) {
		return { ...fullPermissions };
	}

	// 1️⃣ Find membership for this org
	const [m] = await db
		.select({ id: member.id })
		.from(member)
		.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)));

	if (!m) return { ...defaultPerms };

	// 2️⃣ Get linked teams
	const joins = await db.select({ teamId: memberTeam.teamId }).from(memberTeam).where(eq(memberTeam.memberId, m.id));

	if (!joins.length) return { ...defaultPerms };

	const teamIds = joins.map((j) => j.teamId);

	// 3️⃣ Fetch all permissions for those teams
	const teamsPerms = await db.select({ permissions: team.permissions }).from(team).where(inArray(team.id, teamIds));

	if (!teamsPerms.length) return { ...defaultPerms };

	// 4️⃣ Check for admin flag
	const isAdmin = teamsPerms.some((t) => (t.permissions as TeamPermissions | null)?.admin?.administrator === true);

	// 5️⃣ Merge all permissions (most permissive wins)
	const combined: TeamPermissions = JSON.parse(JSON.stringify(defaultPerms));

	for (const { permissions } of teamsPerms) {
		const perms = permissions as TeamPermissions | null;
		if (!perms) continue;

		// Merge each category
		for (const category of ["admin", "content", "tasks", "moderation"] as const) {
			if (!perms[category]) continue;
			for (const [key, value] of Object.entries(perms[category])) {
				if (value === true) {
					(combined[category] as Record<string, boolean>)[key] = true;
				}
			}
		}
	}

	// 6️⃣ If any team is admin, mark *all* permissions true
	if (isAdmin) {
		for (const category of ["admin", "content", "tasks", "moderation"] as const) {
			for (const key of Object.keys(combined[category])) {
				(combined[category] as Record<string, boolean>)[key] = true;
			}
		}
	}

	return combined;
}
