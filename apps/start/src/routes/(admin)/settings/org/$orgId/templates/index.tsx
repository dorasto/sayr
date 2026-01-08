import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationTemplatesPage from "@/components/pages/admin/settings/orgId/templates";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/templates/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Templates" description="Create and manage issue templates for your organization." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationTemplatesPage />
			</div>
		</SubWrapper>
	)
}
