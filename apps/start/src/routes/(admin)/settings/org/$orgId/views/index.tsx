import SettingsOrganizationViewsPage from "@/components/pages/admin/settings/orgId/views";
import { SubWrapper } from "@/components/generic/wrapper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/views/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Saved Views" description="Manage your organization's saved views for tasks." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationViewsPage />
			</div>
		</SubWrapper>
	);
}
