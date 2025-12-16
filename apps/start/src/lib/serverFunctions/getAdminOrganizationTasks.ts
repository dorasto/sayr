import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getAdminOrganizationTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		const { orgId } = data;
		const { getOrganization, getTasksByOrganizationId } = await import("@repo/database");
		const { getAccess } = await import("@/getAccess");
		try {
			const { account } = await getAccess();
			if (!orgId) {
				console.log("🚀 ~ orgId:", orgId);
				throw redirect({ to: "/admin" });
			}
			const organization = await getOrganization(orgId, account.id);
			if (!organization) {
				console.log("🚀 ~ organization:", organization);
				throw redirect({ to: "/admin" });
			}
			const tasks = await getTasksByOrganizationId(organization.id);
			return { tasks };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/admin" });
		}
	});
