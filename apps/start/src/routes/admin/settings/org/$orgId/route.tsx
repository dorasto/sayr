import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";

export const Route = createFileRoute("/admin/settings/org/$orgId")({
	loader: async ({ params }) =>
		await getAdminOrganization({
			data: {
				orgId: params.orgId,
			},
		}),
	component: RouteComponent,
});

function RouteComponent() {
	const { organization, labels, views, categories } = Route.useLoaderData();
	return <Outlet />;
}
