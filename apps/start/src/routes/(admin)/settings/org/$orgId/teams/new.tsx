import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationPageTeamSettings from "@/components/pages/admin/settings/orgId/teamsetttings";
import { SubWrapper } from "@/components/generic/wrapper";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/teams/new")({
	head: () => ({ meta: seo({ title: "New Team · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Create Team" description="Set up a new team with permissions" style="compact">
			<div className="flex flex-col gap-3 w-full">
				<SettingsOrganizationPageTeamSettings isNew={true} />
			</div>
		</SubWrapper>
	);
}
