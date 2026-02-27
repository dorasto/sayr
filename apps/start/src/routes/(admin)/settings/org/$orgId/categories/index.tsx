import SettingsOrganizationCategoriesPage from "@/components/pages/admin/settings/orgId/categories";
import { SubWrapper } from "@/components/generic/wrapper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/categories/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Categories" description="Categories help you organize your tasks into groups for better management and delegation" style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationCategoriesPage />
			</div>
		</SubWrapper>
	);
}
