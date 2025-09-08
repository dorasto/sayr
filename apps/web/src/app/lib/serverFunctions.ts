import { auth } from "@repo/auth";
import { auth as authType, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

/**
 * Retrieves the current authenticated user's account from the session.
 * If no active session exists, the user will be redirected using `redirectAuth()`.
 *
 * @returns An object containing the authenticated user's account.
 * @throws Redirects to "/" if the user is not authenticated.
 *
 * @example
 * ```ts
 * const { account } = await getAccess();
 *
 * console.log(account.id);
 * console.log(account.email);
 * ```
 */
export async function getAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session) {
		return { account: session.user };
	}
	return redirectAuth();
}

/**
 * Fetches a paginated list of users from the authentication API.
 * Requires a valid authenticated session (session cookies are sent automatically).
 *
 * By default, this will fetch the first 100 users, sorted by name in ascending order.
 *
 * @returns A user list response containing an array of users and the total count.
 * If an error occurs, returns a fallback object with an empty `users` array and `total = 0`.
 *
 * @example
 * ```ts
 * const { users, total } = await getUsers();
 *
 * console.log(`Total users: ${total}`);
 * console.log(users.map(u => u.name));
 * ```
 */
export async function getUsers() {
	try {
		const result = await auth.api.listUsers({
			query: {
				limit: 100,
				offset: 0,
				sortBy: "name",
				sortDirection: "asc",
			},
			// This endpoint requires session cookies.
			headers: await headers(),
		});

		return result;
	} catch (error) {
		console.log("🚀 ~ getUsers ~ error:", error);
		return {
			users: [],
			total: 0,
		};
	}
}

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

	return orgsWithMembers;
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
 * const org = await getOrganization("my-cool-org");
 *
 * if (org) {
 *   console.log(`Organization: ${org.name} (${org.slug})`);
 * } else {
 *   console.log("Organization not found.");
 * }
 * ```
 */
export async function getOrganization(org_slug: string) {
	const results = await db
		.select({
			id: schema.organization.id,
			name: schema.organization.name,
			slug: schema.organization.slug,
			logo: schema.organization.logo,
			bannerImg: schema.organization.bannerImg,
			description: schema.organization.description,
			createdAt: schema.organization.createdAt,
		})
		.from(schema.organization)
		.where(eq(schema.organization.slug, org_slug));
	if (results) {
		return results[0];
	}
	return null;
}

export async function setUserRole(userId: string, role: "admin" | "user") {
	const result = await auth.api.setRole({
		body: {
			userId: userId,
			role: role, // "admin" or "user"
		},
		// This endpoint requires session cookies.
		headers: await headers(),
	});

	return result;
}
