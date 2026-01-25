import { SubWrapper } from "@/components/generic/wrapper";
import OrganizationViewsPage from "@/components/pages/admin/orgid/views";
import { IconStack2 } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/$orgId/views/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SubWrapper style="compact" title="Views" icon={<IconStack2 />} description="Drill into specifics">
			<OrganizationViewsPage />
		</SubWrapper>
	);
}
