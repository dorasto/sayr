import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganization } from "@/contexts/ContextOrg";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";

export const Route = createFileRoute("/admin/$orgId")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/home/login" });
		}
		return await getAdminOrganization({
			data: {
				account: context.account,
				orgId: params.orgId,
			},
		});
	},
	component: OrgLayout,
});

function OrgLayout() {
	const { organization, labels, views, categories } = Route.useLoaderData();
	return (
		<RootProviderOrganization organization={organization} labels={labels} views={views} categories={categories}>
			<Outlet />
		</RootProviderOrganization>
	);
}
