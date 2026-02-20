import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationConnectionsPage from "@/components/pages/admin/settings/orgId/connections/connections";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/connections/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Connections</Label>
				<Label variant="subheading" className="text-muted-foreground">Manage integrations and connections with third-party services.</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationConnectionsPage />
			</div>
		</div>
	);
}
