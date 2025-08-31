import { auth } from "@repo/auth";
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
