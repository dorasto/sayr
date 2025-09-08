import { auth } from "@repo/auth";
import { db, schema } from "@repo/database";
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
export async function getOrganizations(user_id: string) {
	const organizations = await db.query.member.findMany({ where: eq(schema.member.userId, user_id) });
	// Run queries in parallel and return results
	const orgs = await Promise.all(
		organizations.map(async (org) => {
			return db.select().from(schema.organization).where(eq(schema.organization.id, org.organizationId));
		})
	);
	return orgs.flat();
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
