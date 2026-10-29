import { getOrganization, getReleaseLatestUpdates, getReleaseTaskCounts } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";

/**
 * The releases board's per-release stats for an org the signed-in user belongs to: task counts (done / in progress /
 * planned) and each release's latest status update (health + when).
 */
export const getReleaseBoardStats = createServerFn({ method: "GET" })
	.validator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		// Identity comes from the session, never from client input (server fns are publicly callable).
		const account = await requireAccount();
		const organization = await getOrganization(data.orgId, account.id, { blockOrgUnseated: true });
		if (!organization) return { taskCounts: {}, latestUpdates: {} };
		const [taskCounts, latestUpdates] = await Promise.all([
			getReleaseTaskCounts(organization.id),
			getReleaseLatestUpdates(organization.id),
		]);
		return { taskCounts, latestUpdates };
	});
