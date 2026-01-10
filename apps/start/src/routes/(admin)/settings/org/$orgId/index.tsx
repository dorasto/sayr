import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationPage from "@/components/pages/admin/settings/orgId";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper title="Organization Settings" style="compact">
			<div className="flex flex-col gap-3">
				<Label variant={"heading"}>General</Label>

				<SettingsOrganizationPage />
			</div>
		</SubWrapper>
	)
}
