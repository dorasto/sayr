import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationPageTeamSettings from "@/components/pages/admin/settings/orgId/teamsetttings";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/teams/new")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Create Team" description="Set up a new team with permissions" style="compact">
			<div className="flex flex-col gap-3 w-full">
				<SettingsOrganizationPageTeamSettings isNew={true} />
			</div>
		</SubWrapper>
	)
}
