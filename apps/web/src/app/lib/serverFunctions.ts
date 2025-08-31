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
				query: {
					organizationId: session.session.activeOrganizationId,
				},
				// This endpoint requires session cookies.
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
