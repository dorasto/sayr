import SettingsOrganizationCategoriesPage from "@/components/pages/admin/settings/orgId/categories";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/categories/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Categories</Label>
				<Label variant="subheading" className="text-muted-foreground">Categories help you organize your tasks into groups for better management and delegation</Label>
			</div>
			<div className="flex flex-col gap-3">
				<SettingsOrganizationCategoriesPage />
			</div>
		</div>
	);
}
