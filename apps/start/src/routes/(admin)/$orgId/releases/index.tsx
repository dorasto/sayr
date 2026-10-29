import { createFileRoute } from "@tanstack/react-router";
import OrganizationReleasesPage from "@/components/pages/admin/orgid/releases";

export const Route = createFileRoute("/(admin)/$orgId/releases/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <OrganizationReleasesPage />;
}
