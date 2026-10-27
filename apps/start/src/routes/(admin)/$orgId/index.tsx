import { createFileRoute, redirect } from "@tanstack/react-router";
import OrganizationHomePage from "@/components/pages/admin/orgid";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";

export const Route = createFileRoute("/(admin)/$orgId/")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		return await getAdminOrganizationTasks({
			data: {
				orgId: params.orgId,
			},
		});
	},
	component: OrganizationHomePage,
});
