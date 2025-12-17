import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getAdminOrganizationSettings } from "@/lib/serverFunctions/getAdminOrganizationSettings";
import { SettingsProviderOrganization } from "@/contexts/ContextOrgSettings";

export const Route = createFileRoute("/admin/settings/org/$orgId")({
	loader: async ({ params }) =>
		await getAdminOrganizationSettings({
			data: {
				orgId: params.orgId,
			},
		}),
	component: RouteComponent,
});

function RouteComponent() {
	const { organization, labels, views, categories, tasks } = Route.useLoaderData();
	return (
		<SettingsProviderOrganization
			organization={organization}
			labels={labels}
			views={views}
			categories={categories}
			tasks={tasks}
		>
			<Outlet />
		</SettingsProviderOrganization>
	);
}
