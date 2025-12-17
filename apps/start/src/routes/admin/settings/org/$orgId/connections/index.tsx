import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationConnectionsPage from "@/components/pages/admin/settings/orgId/connections/connections";

export const Route = createFileRoute("/admin/settings/org/$orgId/connections/")(
	{
		component: RouteComponent,
	},
);

function RouteComponent() {
	return (
		<SubWrapper
			title="Connections"
			description="Manage integrations and connections with third-party services."
			style="compact"
		>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationConnectionsPage />
			</div>
		</SubWrapper>
	);
}
