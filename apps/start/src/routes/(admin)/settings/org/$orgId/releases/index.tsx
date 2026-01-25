import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationReleasesPage from "@/components/pages/admin/settings/orgId/releases";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/releases/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper
			title="Releases"
			description="Create and manage releases to track what ships in each version."
			style="compact"
		>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationReleasesPage />
			</div>
		</SubWrapper>
	);
}
