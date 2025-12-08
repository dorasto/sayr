import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getAdminOrganizationTask = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string; taskShortId: number }) => data)
	.handler(async ({ data }) => {
		const { orgId, taskShortId } = data;
		const { getOrganization, getTaskByShortId } = await import("@repo/database");
		const { getAccess } = await import("./getAccess");
		try {
			const { account } = await getAccess();
			if (!orgId) {
				throw redirect({ to: "/admin" });
			}
			const organization = await getOrganization(orgId, account.id);
			if (!organization) {
				throw redirect({ to: "/admin" });
			}
			const task = await getTaskByShortId(organization.id, taskShortId);
			if (!task) {
				//@ts-expect-error should be fine
				throw redirect({ to: `/admin/${organization.id}/tasks` });
			}
			return { task };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/admin" });
		}
	});
