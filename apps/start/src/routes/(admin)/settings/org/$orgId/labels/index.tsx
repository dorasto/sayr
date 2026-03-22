import SettingsOrganizationLabelsPage from "@/components/pages/admin/settings/orgId/labels";
import { SubWrapper } from "@/components/generic/wrapper";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/labels/")({
	head: () => ({ meta: seo({ title: "Labels · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Labels" description="Create and manage labels to organize your tasks." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationLabelsPage />
			</div>
		</SubWrapper>
	);
}
