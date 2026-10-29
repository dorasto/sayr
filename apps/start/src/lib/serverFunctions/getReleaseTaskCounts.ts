import { getOrganization, getReleaseTaskCounts as getReleaseTaskCountsForOrg } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";

/** Task counts per release (done / in progress / planned) for an org the signed-in user belongs to. */
export const getReleaseTaskCounts = createServerFn({ method: "GET" })
	.validator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		// Identity comes from the session, never from client input (server fns are publicly callable).
		const account = await requireAccount();
		const organization = await getOrganization(data.orgId, account.id, { blockOrgUnseated: true });
		if (!organization) return {};
		return getReleaseTaskCountsForOrg(organization.id);
	});
