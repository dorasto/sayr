import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
export async function getOrganization(orgId: string, userId: string): Promise<{ id: string } | null> {
	// Check if the user is a member of this org
	const membership = await db.query.member.findFirst({
		where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)),
	});

	// If no membership found, deny access
	if (!membership) {
		return null; // or throw new Error("Unauthorized");
	}

	// Fetch the organization itself
	const [organization] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.id, orgId));

	if (!organization) return null;

	return organization;
}

export async function safeGetOrganization(orgId: string, userId: string, ms = 5000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);

	try {
		return await getOrganization(orgId, userId);
	} catch (err) {
		console.warn("DB timeout / error in getOrganization", err);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Verifies a user's membership role within an organization.
 *
 * @param userId - The ID of the user (from session)
 * @param orgId - The ID of the organization
 * @param allowedRoles - Array of roles allowed to pass authorization
 *                       (default: ["owner", "admin"])
 * @returns A promise that resolves to a boolean indicating whether the user
 *          is authorized
 *
 * @example
 * ```ts
 * const canManage = await checkMembershipRole(session?.userId, "org_123");
 * if (!canManage) {
 *   throw new Error("UNAUTHORIZED");
 * }
 *
 * // With custom roles
 * const canEdit = await checkMembershipRole(session?.userId, "org_123", [
 *   "editor",
 *   "moderator",
 * ]);
 * ```
 */
export async function checkMembershipRole(
	userId: string | undefined,
	orgId: string,
	allowedRoles: string[] = ["owner", "admin"]
): Promise<boolean> {
	if (!userId) return false;

	const [role] = await db
		.select()
		.from(schema.member)
		.where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, orgId)));

	return allowedRoles.includes(role?.role || "");
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function encodeCursor(obj: Record<string, any>): string {
	return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

// biome-ignore lint/suspicious/noExplicitAny: <need for the cursor>
export function decodeCursor<T = any>(cursor?: string): T | undefined {
	if (!cursor) return undefined;
	try {
		const str = Buffer.from(cursor, "base64url").toString("utf8");
		return JSON.parse(str);
	} catch {
		return undefined;
	}
}
