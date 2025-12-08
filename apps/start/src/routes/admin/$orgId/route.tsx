import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderOrganization } from "@/contexts/ContextOrg";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";

export const Route = createFileRoute("/admin/$orgId")({
	loader: async ({ params }) =>
		await getAdminOrganization({
			data: {
				orgId: params.orgId,
			},
		}),
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
