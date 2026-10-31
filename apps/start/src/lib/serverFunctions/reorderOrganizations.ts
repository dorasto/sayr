import { reorderOrganizations } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";

// Saves the caller's sidebar order of their organizations (SAY-104). Same direct-serverFn-to-DB shape as
// personalViews.ts: the only authorization is "these are the caller's own memberships", which
// reorderOrganizations enforces by scoping its update to the session's user id.
export const reorderOrganizationsAction = createServerFn({ method: "POST" })
	.validator((data: { orderedOrgIds: string[] }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await reorderOrganizations(account.id, data.orderedOrgIds);
		return { success: true };
	});
