import SettingsOrganizationLabelsPage from "@/components/pages/admin/settings/orgId/labels";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/labels/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Labels</Label>
				<Label variant="subheading" className="text-muted-foreground">Create and manage labels to organize your tasks.</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationLabelsPage />
			</div>
		</div>
	);
}
