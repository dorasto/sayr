import crypto from "node:crypto";
import { ensureCdnUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { db, schema } from "..";
import { defaultTeamPermissions, type TeamPermissions } from "../../schema/member.schema";

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
				with: { user: true },
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
 * Creates a default "Administrators" team for an organization with full permissions
 * and adds all existing organization members to it.
 *
 * This function is idempotent - if an "Administrators" team already exists,
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
		where: (t, { and, eq }) => and(eq(t.organizationId, orgId), eq(t.name, "Administrators")),
	});

	// Create if it doesn't exist
	if (!adminTeam) {
		const [created] = await db
			.insert(schema.team)
			.values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				name: "Administrators",
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
