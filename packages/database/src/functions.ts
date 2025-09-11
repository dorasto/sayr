import { and, eq } from "drizzle-orm";
import { auth as authType, db, schema } from ".";

/**
 * Retrieves all organizations that a given user belongs to, including
 * their members and associated user account details.
 *
 * This function:
 * 1. Finds all organization memberships for the provided `userId`.
 * 2. Fetches each organization.
 * 3. Fetches all members of that organization.
 * 4. Augments each member with the corresponding user information.
 * 5. Returns the organizations with enriched member data.
 *
 * @param userId - The ID of the user whose organizations should be retrieved.
 * @returns A promise that resolves to an array of organizations,
 * each containing its members and each member's user information.
 *
 * @example
 * ```ts
 * const orgs = await getOrganizations("user_123");
 *
 * orgs.forEach(org => {
 *   console.log(`Organization: ${org.name}`);
 *   org.members.forEach(member => {
 *     console.log(`- ${member.user.name} (${member.user.email})`);
 *   });
 * });
 * ```
 */
export async function getOrganizations(userId: string) {
	// First, get all the organizations for this user
	const organizations = await db.query.member.findMany({
		where: eq(schema.member.userId, userId),
	});

	// Run queries in parallel and merge results
	const orgsWithMembers = await Promise.all(
		organizations.map(async (org) => {
			// Fetch the organization itself
			const [organization] = await db
				.select()
				.from(schema.organization)
				.where(eq(schema.organization.id, org.organizationId));

			// Fetch all members for this org
			const members = await db.query.member.findMany({
				where: eq(schema.member.organizationId, org.organizationId),
			});

			// For each member, fetch the user and merge
			const membersWithUsers = await Promise.all(
				members.map(async (member) => {
					const [user] = await db
						.select({
							id: authType.user.id,
							name: authType.user.name,
							email: authType.user.email,
							image: authType.user.image,
							createdAt: authType.user.createdAt,
							updatedAt: authType.user.updatedAt,
						})
						.from(authType.user)
						.where(eq(authType.user.id, member.userId));

					return {
						...member,
						user, // attach user info to each member
					};
				})
			);

			return {
				...organization,
				members: membersWithUsers,
			};
		})
	);

	return orgsWithMembers as schema.OrganizationWithMembers[];
}

/**
 * Retrieves a single organization by its ID **only if the user
 * belongs to it**, including all members and their user details.
 *
 * @param orgId - The ID of the organization to retrieve.
 * @param userId - The ID of the requesting user (must be a member).
 * @returns The organization with enriched member data, or `null` if the user
 * is not part of the organization.
 *
 * @example
 * ```ts
 * const org = await getOrganization("org_123", "user_123");
 * if (org) {
 *   console.log(`Organization: ${org.name}`);
 *   org.members.forEach(member => {
 *     console.log(`- ${member.user.name} (${member.user.email})`);
 *   });
 * } else {
 *   console.log("User does not belong to this organization.");
 * }
 * ```
 */
export async function getOrganization(orgId: string, userId: string) {
	// Check if the user is a member of this org
	const membership = await db.query.member.findFirst({
		where: and(eq(schema.member.organizationId, orgId), eq(schema.member.userId, userId)),
	});

	// If no membership found, deny access
	if (!membership) {
		return null; // or throw new Error("Unauthorized");
	}

	// Fetch the organization itself
	const [organization] = await db.select().from(schema.organization).where(eq(schema.organization.id, orgId));

	if (!organization) return null;

	// Fetch all members for this org
	const members = await db.query.member.findMany({
		where: eq(schema.member.organizationId, orgId),
	});

	// For each member, fetch the user and merge
	const membersWithUsers = await Promise.all(
		members.map(async (member) => {
			const [user] = await db
				.select({
					id: authType.user.id,
					name: authType.user.name,
					email: authType.user.email,
					image: authType.user.image,
					createdAt: authType.user.createdAt,
					updatedAt: authType.user.updatedAt,
				})
				.from(authType.user)
				.where(eq(authType.user.id, member.userId));

			return {
				...member,
				user,
			};
		})
	);

	return {
		...organization,
		members: membersWithUsers,
	} as schema.OrganizationWithMembers;
}

/**
 * Retrieves all membership records for a given organization.
 *
 * @param orgId - The ID of the organization to retrieve members for.
 * @returns A list of membership records belonging to the organization.
 *
 * @example
 * ```ts
 * const members = await getOrganizationMembers("org_123");
 * members.forEach(member => {
 *   console.log(`Member ID: ${member.id}, User ID: ${member.userId}`);
 * });
 * ```
 */
export async function getOrganizationMembers(orgId: string) {
	const membership = await db.query.member.findMany({
		where: and(eq(schema.member.organizationId, orgId)),
	});
	return membership;
}

/**
 * Fetches a single organization by its unique slug.
 *
 * This query selects the organization's core profile fields including
 * `id`, `name`, `slug`, `logo`, `bannerImg`, `createdAt` and `description`.
 *
 * @param org_slug - The unique slug identifier of the organization.
 * @returns A promise that resolves to the organization's data if found,
 * or `null` if no organization exists with the given slug.
 *
 * @example
 * ```ts
 * const org = await getOrganizationPublic("my-cool-org");
 *
 * if (org) {
 *   console.log(`Organization: ${org.name} (${org.slug})`);
 * } else {
 *   console.log("Organization not found.");
 * }
 * ```
 */
export async function getOrganizationPublic(org_slug: string) {
	const results = await db.select().from(schema.organization).where(eq(schema.organization.slug, org_slug));
	if (results) {
		return results[0];
	}
	return null;
}
