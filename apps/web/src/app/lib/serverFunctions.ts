import { auth } from "@repo/auth";
import { auth as authType, db } from "@repo/database";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirectAuth } from "@/app/lib/redirectAuth";

export async function getAccess() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (session) {
		if (session.session.activeOrganizationId) {
			const data = await auth.api.getFullOrganization({
				headers: await headers(),
			});
			return {
				account: session.user,
				organization: data,
			};
		}
		return { account: session.user, organization: null };
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

export async function getOrganization(org_slug: string) {
	const results = await db
		.select({
			id: authType.organization.id,
			name: authType.organization.name,
			slug: authType.organization.slug,
			logo: authType.organization.logo,
			bannerImg: authType.organization.bannerImg,
		})
		.from(authType.organization)
		.where(eq(authType.organization.slug, org_slug));
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
