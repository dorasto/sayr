import OrganizationReleasesPage from "@/components/pages/admin/orgid/releases";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/$orgId/releases/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <OrganizationReleasesPage />;
}
