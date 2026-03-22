import SettingsOrganizationTemplatesPage from "@/components/pages/admin/settings/orgId/templates";
import { SubWrapper } from "@/components/generic/wrapper";
import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/templates/")({
	head: () => ({ meta: seo({ title: "Templates · Settings" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Templates" description="Create and manage issue templates for your organization." style="compact">
			<div className="flex flex-col gap-3">
				<SettingsOrganizationTemplatesPage />
			</div>
		</SubWrapper>
	);
}
