import { getOrganization, getTasksByOrganizationId, type schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getAdminOrganizationTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string }) => data)
	.handler(async ({ data }) => {
		const { account, orgId } = data;
		try {
			if (!orgId) {
				console.log("🚀 ~ orgId:", orgId);
				throw redirect({ to: "/" });
			}
			const organization = await getOrganization(orgId, account.id);
			if (!organization) {
				console.log("🚀 ~ organization:", organization);
				throw redirect({ to: "/" });
			}
			const tasks = await getTasksByOrganizationId(organization.id);
			return { tasks };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
