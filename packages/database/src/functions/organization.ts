import crypto from "node:crypto";
import { ensureCdnUrl } from "@repo/util";
import { and, eq, ilike, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { db, schema, auth } from "..";
import { defaultTeamPermissions, type TeamPermissions } from "../../schema/member.schema";
import { userSummaryColumns, userSummarySelect } from "./index";

/**
 * Retrieves all organizations that a given user belongs to, including
 * their members and associated user account details.
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
export async function getOrganizations(userId: string): Promise<schema.OrganizationWithMembers[]> {
	// Step 1: Find orgIds the user belongs to
	const memberships = await db.query.member.findMany({
		where: (member) => eq(member.userId, userId),
	});

	if (memberships.length === 0) return [];

	const orgIds = memberships.map((m) => m.organizationId);

	// Step 2: Load organizations with members + users in a *single query*
	const orgsWithMembers = await db.query.organization.findMany({
		with: {
			members: {
				with: {
					user: true, // ✅ this now works because of relations()
				},
			},
		},
		where: (organization, { inArray }) => inArray(organization.id, orgIds),
	});

	// Step 3: Rewrite the logo URL
	const enriched = orgsWithMembers.map((org) => ({
		...org,
		logo: org.logo ? ensureCdnUrl(org.logo) : null,
		bannerImg: org.bannerImg ? ensureCdnUrl(org.bannerImg) : null,
	}));

	return enriched;
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
export async function getOrganization(orgId: string, userId: string): Promise<schema.OrganizationWithMembers | null> {
	const organization = await db.query.organization.findFirst({
		where: (org) => eq(org.id, orgId),
		with: {
			members: {
				with: {
					user: true,
					teams: {
						with: { team: true },
					},
				},
			},
		},
	});

	// Ensure the current user is part of it
	if (!organization?.members.some((m) => m.userId === userId)) {
		return null; // unauthorized
	}
	return {
		...organization,
		logo: organization.logo ? ensureCdnUrl(organization.logo) : null,
		bannerImg: organization.bannerImg ? ensureCdnUrl(organization.bannerImg) : null,
	};
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
export async function getOrganizationMembers(orgId: string): Promise<schema.OrganizationMemberType[]> {
	return db.query.member.findMany({
		where: (member) => eq(member.organizationId, orgId),
	});
}

/**
 * Fetches a single organization by its unique slug.
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
export async function getOrganizationPublic(orgSlug: string): Promise<schema.OrganizationWithMembers | null> {
	const organization = await db.query.organization.findFirst({
		where: (org) => eq(org.slug, orgSlug),
		with: {
			members: {
				with: {
					user: {
						columns: {
							id: true,
							name: true,
							image: true,
							createdAt: true,
						},
					},
					teams: {
						with: {
							team: {
								columns: {
									id: true,
									name: true,
									permissions: true,
								},
							},
						},
					},
				},
			},
		},
	});
	if (organization) {
		return {
			...organization,
			logo: organization.logo ? ensureCdnUrl(organization.logo) : null,
			bannerImg: organization.bannerImg ? ensureCdnUrl(organization.bannerImg) : null,
			privateId: null,
		};
	}
	return null;
}

/**
 * Fetches a single organization by its Id
 *
 * @param orgId - The unique identifier of the organization.
 * @returns A promise that resolves to the organization's data if found,
 * or `null` if no organization exists with the given id.
 *
 * @example
 * ```ts
 * const org = await getOrganizationPublic("uuid");
 *
 * if (org) {
 *   console.log(`Organization: ${org.name} (${org.slug})`);
 * } else {
 *   console.log("Organization not found.");
 * }
 * ```
 */
export async function getOrganizationPublicById(orgId: string): Promise<schema.organizationType | null> {
	const organization = await db.query.organization.findFirst({
		where: (org) => eq(org.id, orgId),
	});
	if (organization) {
		return {
			...organization,
			logo: organization.logo ? ensureCdnUrl(organization.logo) : null,
			bannerImg: organization.bannerImg ? ensureCdnUrl(organization.bannerImg) : null,
			privateId: null,
		};
	}
	return null;
}

/** Full admin permissions - all flags set to true */
const fullAdminPermissions: TeamPermissions = {
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
 * Creates a default "Admin" team for an organization with full permissions
 * and adds all existing organization members to it.
 *
 * This function is idempotent - if an "Admin" team already exists,
 * it will just ensure all members are added to it.
 *
 * @param orgId - The ID of the organization to bootstrap.
 * @returns The created or existing Administrators team.
 *
 * @example
 * ```ts
 * // On org creation
 * const adminTeam = await bootstrapOrganizationAdminTeam("org_123");
 *
 * // For existing orgs that need the admin team
 * await bootstrapOrganizationAdminTeam("existing_org_456");
 * ```
 */
export async function bootstrapOrganizationAdminTeam(orgId: string): Promise<schema.OrganizationTeamType> {
	// Check if Administrators team already exists
	let adminTeam = await db.query.team.findFirst({
		where: (t, { and, eq }) => and(eq(t.organizationId, orgId), eq(t.name, "Admin")),
	});

	// Create if it doesn't exist
	if (!adminTeam) {
		const [created] = await db
			.insert(schema.team)
			.values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				name: "Admin",
				description: "Full access to all organization settings and content",
				permissions: fullAdminPermissions,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create Administrators team");
		}
		adminTeam = created;
	}

	// Get all organization members
	const members = await db.query.member.findMany({
		where: (m) => eq(m.organizationId, orgId),
	});

	// Get existing team memberships
	const existingMemberships = await db.query.memberTeam.findMany({
		where: (mt) => eq(mt.teamId, adminTeam.id),
	});

	const existingMemberIds = new Set(existingMemberships.map((mt) => mt.memberId));

	// Add any members not already in the team
	const membersToAdd = members.filter((m) => !existingMemberIds.has(m.id));

	if (membersToAdd.length > 0) {
		await db.insert(schema.memberTeam).values(
			membersToAdd.map((m) => ({
				id: crypto.randomUUID(),
				memberId: m.id,
				teamId: adminTeam.id,
			}))
		);
	}

	return adminTeam;
}

/**
 * Adds a member to the default Administrators team when they join an organization.
 * If the Administrators team doesn't exist, it will be created first.
 *
 * @param orgId - The ID of the organization.
 * @param memberId - The ID of the member to add.
 */
export async function addMemberToAdminTeam(orgId: string, memberId: string): Promise<void> {
	// Ensure admin team exists
	const adminTeam = await bootstrapOrganizationAdminTeam(orgId);

	// Check if already a member
	const existing = await db.query.memberTeam.findFirst({
		where: (mt, { and, eq }) => and(eq(mt.teamId, adminTeam.id), eq(mt.memberId, memberId)),
	});

	if (!existing) {
		await db.insert(schema.memberTeam).values({
			id: crypto.randomUUID(),
			memberId,
			teamId: adminTeam.id,
		});
	}
}

/**
 * Searches organization members by name/displayName with optional text query.
 * Returns UserSummary objects (id, name, image, displayName) for use in mention autocomplete.
 *
 * @param orgId - The organization to search within.
 * @param options - Optional search parameters.
 * @param options.query - Text to match against user name or displayName (case-insensitive).
 * @param options.limit - Max results to return (default 20).
 * @returns Array of UserSummary objects matching the criteria.
 *
 * @example
 * ```ts
 * // Get first 20 members (no filter)
 * const members = await searchOrgMembers("org_123");
 *
 * // Search by name
 * const results = await searchOrgMembers("org_123", { query: "tom", limit: 10 });
 * ```
 */
export async function searchOrgMembers(
	orgId: string,
	options?: { query?: string; limit?: number }
): Promise<schema.UserSummary[]> {
	const limit = options?.limit ?? 20;
	const query = options?.query?.trim();

	// Use relational query to get members with user data
	const members = await db.query.member.findMany({
		where: (member) => eq(member.organizationId, orgId),
		with: {
			user: {
				columns: userSummaryColumns,
			},
		},
	});

	let users = members.map((m) => m.user);

	// Filter by query if provided
	if (query) {
		const lowerQuery = query.toLowerCase();
		users = users.filter((user) => {
			const matchesName = user.name.toLowerCase().includes(lowerQuery);
			const matchesDisplayName = user.displayName?.toLowerCase().includes(lowerQuery);
			return matchesName || matchesDisplayName;
		});
	}

	// Apply limit
	return users.slice(0, limit);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*                          BLOCKED USERS                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Searches for users who have interacted with an organization's tasks
 * (via comments, votes, or reactions) but are NOT org members.
 * Used for the "block user" search UI.
 *
 * Uses a SQL UNION across interaction tables to find distinct user IDs,
 * then joins to the user table for name/avatar data.
 * Excludes org members and optionally filters by name/displayName via ILIKE.
 *
 * @param orgId - The organization to search within.
 * @param options - Optional search parameters.
 * @param options.query - Text to fuzzy match against user name or displayName.
 * @param options.limit - Max results to return (default 20).
 * @returns Array of UserSummary objects for non-member interactors.
 */
export async function searchOrgInteractors(
	orgId: string,
	options?: { query?: string; limit?: number },
): Promise<schema.UserSummary[]> {
	const limit = options?.limit ?? 20;
	const query = options?.query?.trim();

	// Get member user IDs to exclude
	const memberRows = await db.query.member.findMany({
		where: (m) => eq(m.organizationId, orgId),
		columns: { userId: true },
	});
	const memberUserIds = memberRows.map((m) => m.userId);

	// Use raw SQL to UNION distinct user IDs across interaction tables.
	// This is far more efficient than loading all interactions into JS.
	const interactorQuery = sql`
		SELECT DISTINCT user_id FROM (
			SELECT created_by AS user_id FROM task_comment
			WHERE organization_id = ${orgId} AND created_by IS NOT NULL
			UNION
			SELECT user_id FROM task_vote
			WHERE organization_id = ${orgId} AND user_id IS NOT NULL
			UNION
			SELECT user_id FROM task_comment_reaction
			WHERE organization_id = ${orgId}
		) AS interactors
		WHERE user_id IS NOT NULL
	`;

	const interactorRows = await db.execute(interactorQuery);
	const allInteractorIds = (interactorRows as unknown as Array<{ user_id: string }>).map((r) => r.user_id);

	// Filter out org members
	const nonMemberIds = allInteractorIds.filter((id) => !memberUserIds.includes(id));

	if (nonMemberIds.length === 0) return [];

	// Fetch user summaries
	const users = await db
		.select(userSummarySelect)
		.from(auth.user)
		.where(inArray(auth.user.id, nonMemberIds));

	// Apply text filter if provided
	let filtered = users;
	if (query) {
		const lowerQuery = query.toLowerCase();
		filtered = users.filter((u) => {
			const matchesName = u.name.toLowerCase().includes(lowerQuery);
			const matchesDisplayName = u.displayName?.toLowerCase().includes(lowerQuery);
			return matchesName || matchesDisplayName;
		});
	}

	return filtered.slice(0, limit);
}

/**
 * Returns all blocked users for an organization, with user summary data
 * for both the blocked user and the admin who performed the block.
 *
 * @param orgId - The organization to get blocked users for.
 * @returns Array of BlockedUserWithDetails objects.
 */
export async function getBlockedUsers(orgId: string): Promise<schema.BlockedUserWithDetails[]> {
	const blocked = await db.query.blockedUser.findMany({
		where: (bu) => eq(bu.organizationId, orgId),
		with: {
			user: { columns: userSummaryColumns },
			blockedByUser: { columns: userSummaryColumns },
		},
		orderBy: (bu, { desc }) => [desc(bu.createdAt)],
	});

	return blocked as schema.BlockedUserWithDetails[];
}

/**
 * Blocks a user from interacting with an organization.
 *
 * @param orgId - The organization ID.
 * @param userId - The user ID to block.
 * @param blockedBy - The admin user ID who is performing the block.
 * @param reason - Optional reason for the block.
 * @returns The created blocked user record with details, or null if already blocked.
 */
export async function blockUser(
	orgId: string,
	userId: string,
	blockedBy: string,
	reason?: string,
): Promise<schema.BlockedUserWithDetails | null> {
	// Check if already blocked
	const existing = await db.query.blockedUser.findFirst({
		where: (bu) => and(eq(bu.organizationId, orgId), eq(bu.userId, userId)),
	});

	if (existing) return null;

	const [inserted] = await db
		.insert(schema.blockedUser)
		.values({
			organizationId: orgId,
			userId,
			blockedBy,
			reason: reason || null,
		})
		.returning();

	if (!inserted) return null;

	// Fetch full details for the response
	const full = await db.query.blockedUser.findFirst({
		where: (bu) => eq(bu.id, inserted.id),
		with: {
			user: { columns: userSummaryColumns },
			blockedByUser: { columns: userSummaryColumns },
		},
	});

	return (full as schema.BlockedUserWithDetails) || null;
}

/**
 * Removes a user from an organization's block list.
 *
 * @param orgId - The organization ID.
 * @param userId - The user ID to unblock.
 * @returns True if a record was deleted, false if user was not blocked.
 */
export async function unblockUser(orgId: string, userId: string): Promise<boolean> {
	const result = await db
		.delete(schema.blockedUser)
		.where(and(eq(schema.blockedUser.organizationId, orgId), eq(schema.blockedUser.userId, userId)))
		.returning({ id: schema.blockedUser.id });

	return result.length > 0;
}

/**
 * Returns just the user IDs of all blocked users for an organization.
 * Lightweight version for comment filtering — no user details needed.
 *
 * @param orgId - The organization ID.
 * @returns Array of blocked user IDs.
 */
export async function getBlockedUserIds(orgId: string): Promise<string[]> {
	const blocked = await db.query.blockedUser.findMany({
		where: (bu) => eq(bu.organizationId, orgId),
		columns: { userId: true },
	});
	return blocked.map((b) => b.userId);
}

/**
 * Checks if a specific user is blocked in an organization.
 *
 * @param orgId - The organization ID.
 * @param userId - The user ID to check.
 * @returns True if the user is blocked.
 */
export async function isUserBlocked(orgId: string, userId: string): Promise<boolean> {
	const blocked = await db.query.blockedUser.findFirst({
		where: (bu) => and(eq(bu.organizationId, orgId), eq(bu.userId, userId)),
		columns: { id: true },
	});
	return !!blocked;
}
