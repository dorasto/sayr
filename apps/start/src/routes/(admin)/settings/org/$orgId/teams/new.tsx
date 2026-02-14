import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import SettingsOrganizationPageTeamSettings from "@/components/pages/admin/settings/orgId/teamsetttings";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/teams/new")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Create Team</Label>
				<Label variant="subheading" className="text-muted-foreground">Set up a new team with permissions</Label>
			</div>
			<div className="flex flex-col gap-3 w-full">
				<SettingsOrganizationPageTeamSettings isNew={true} />
			</div>
		</div>
	);
}
