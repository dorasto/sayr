import { createFileRoute, redirect } from "@tanstack/react-router";
import OrganizationHomePage from "@/components/pages/admin/orgid";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";

export const Route = createFileRoute("/(admin)/$orgId/")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getAdminOrganizationTasks({
			data: {
				account: context.account,
				orgId: params.orgId,
			},
		})
	},
	component: OrganizationHomePage,
});
