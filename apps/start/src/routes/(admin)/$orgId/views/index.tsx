import OrganizationViewsPage from "@/components/pages/admin/orgid/views";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/$orgId/views/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <OrganizationViewsPage />;
}
