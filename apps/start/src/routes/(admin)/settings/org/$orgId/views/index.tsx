import SettingsOrganizationViewsPage from "@/components/pages/admin/settings/orgId/views";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/views/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Saved Views</Label>
				<Label variant="subheading" className="text-muted-foreground">Manage your organization's saved views for tasks.</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationViewsPage />
			</div>
		</div>
	);
}
