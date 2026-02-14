import SettingsOrganizationReleasesPage from "@/components/pages/admin/settings/orgId/releases";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/releases/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Releases</Label>
				<Label variant="subheading" className="text-muted-foreground">Create and manage releases to track what ships in each version.</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationReleasesPage />
			</div>
		</div>
	);
}
