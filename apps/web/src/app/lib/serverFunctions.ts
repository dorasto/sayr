import { auth } from "@repo/auth";
import { auth as authType, db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

export async function getAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session) {
		return { account: session.user };
	}
	return redirectAuth();
}

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

export async function getOrganization(org_slug: string) {
	const results = await db
		.select({
			id: schema.organization.id,
			name: schema.organization.name,
			slug: schema.organization.slug,
			logo: schema.organization.logo,
			bannerImg: schema.organization.bannerImg,
			description: schema.organization.description,
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
