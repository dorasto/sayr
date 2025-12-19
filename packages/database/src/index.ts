export * as auth from "../schema/auth";
export * as schema from "../schema/index";
export * from "./database";
export * from "./functions";

import { and, eq, inArray } from "drizzle-orm";
import { member, memberTeam, team } from "../schema";
import { db } from "./database";

/**
 * Determines whether a user has a specific organization-level permission.
 *
 * - Evaluates across all teams the member belongs to within the org.
 * - "Administrator" grants full access to all permissions.
 * - Applies "most permissive wins" logic for shared roles.
 */
export async function hasOrgPermission(
	userId: string,
	orgId: string,
	permName: keyof NonNullable<(typeof team.$inferSelect)["permissions"]>
): Promise<boolean> {
	// 1️⃣ Find membership for this org
	const [m] = await db
		.select({ id: member.id })
		.from(member)
		.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)));

	if (!m) return false;

	// 2️⃣ Get connected teams
	const joins = await db.select({ teamId: memberTeam.teamId }).from(memberTeam).where(eq(memberTeam.memberId, m.id));

	if (!joins.length) return false;

	const teamIds = joins.map((j) => j.teamId);

	// 3️⃣ Pull all team permission JSONs
	const teamsPerms = await db.select({ permissions: team.permissions }).from(team).where(inArray(team.id, teamIds));

	// 4️⃣ Administrator = full access override
	const isAdmin = teamsPerms.some((t) => t.permissions?.administrator);
	if (isAdmin) return true;

	// 5️⃣ Aggregate permissions
	const allowed = teamsPerms.some((t) => t.permissions?.[permName]);
	return allowed;
}

/**
 * Type inferred from your team JSON column
 */
type PermissionMap = NonNullable<(typeof team.$inferSelect)["permissions"]>;

/**
 * Builds a merged, organization-scoped permission object for a given user.
 *
 * - Merges all team permissions belonging to the user's org membership.
 * - "Administrator" = full access to **all** permissions.
 * - "Most permissive wins" = any true flag across teams stays true.
 */
export async function getOrgPermissions(userId: string, orgId: string): Promise<PermissionMap> {
	// 1️⃣ Find membership for this org
	const [m] = await db
		.select({ id: member.id })
		.from(member)
		.where(and(eq(member.userId, userId), eq(member.organizationId, orgId)));

	if (!m) return { administrator: false, members: false, teams: false, categories: false, labels: false };

	// 2️⃣ Get linked teams
	const joins = await db.select({ teamId: memberTeam.teamId }).from(memberTeam).where(eq(memberTeam.memberId, m.id));

	if (!joins.length) return { administrator: false, members: false, teams: false, categories: false, labels: false };

	const teamIds = joins.map((j) => j.teamId);

	// 3️⃣ Fetch all permissions for those teams
	const teamsPerms = await db.select({ permissions: team.permissions }).from(team).where(inArray(team.id, teamIds));

	if (!teamsPerms.length)
		return { administrator: false, members: false, teams: false, categories: false, labels: false };

	// 4️⃣ Check for admin flag
	const isAdmin = teamsPerms.some((t) => t.permissions?.administrator === true);

	// 5️⃣ Collect all possible keys across every team
	const allKeys = new Set<string>();
	for (const { permissions } of teamsPerms) {
		for (const key of Object.keys(permissions ?? {})) {
			allKeys.add(key);
		}
	}

	// 6️⃣ Merge all permissions (most permissive wins)
	const combined = teamsPerms.reduce((acc, { permissions }) => {
		for (const [key, value] of Object.entries(permissions ?? {})) {
			const permKey = key as keyof PermissionMap;
			acc[permKey] = acc[permKey] || Boolean(value);
		}
		return acc;
	}, {} as PermissionMap);

	// 7️⃣ If any team is admin, mark *all* permissions true
	if (isAdmin) {
		for (const key of allKeys) {
			const permKey = key as keyof PermissionMap;
			combined[permKey] = true;
		}

		// Ensure admin flag stays true even if missing from dataset
		combined.administrator = true;
	}

	return combined;
}
