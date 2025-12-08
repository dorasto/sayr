import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getAdminOrganizationTask = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string; taskShortId: number }) => data)
	// @ts-expect-error - TanStack Start's type system is too strict for JSONB fields (description, blockNote)
	.handler(async ({ data }) => {
		const { getAccess } = await import("./getAccess");
		const { getOrganization, getTaskByShortId } = await import("@repo/database");
		try {
			const { account } = await getAccess();
			if (!data.orgId) {
				throw redirect({ to: "/admin" });
			}
			const organization = await getOrganization(data.orgId, account.id);
			if (!organization) {
				throw redirect({ to: "/admin" });
			}
			const task = await getTaskByShortId(organization.id, data.taskShortId);
			if (!task) {
				//@ts-expect-error should be fine
				return redirect({ to: `/admin/${organization.id}/tasks` });
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
