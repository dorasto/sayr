import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";
import { RootProviderOrganization } from "./Context";

export const Route = createFileRoute("/admin/$orgId")({
	loader: async ({ params }) =>
		await getAdminOrganization({
			data: {
				orgId: params.orgId,
			},
		}),
	component: MineLayout,
});

function MineLayout() {
	const { organization, labels, views, categories } = Route.useLoaderData();
	return (
		<RootProviderOrganization organization={organization} labels={labels} views={views} categories={categories}>
			<Outlet />
		</RootProviderOrganization>
	);
}
