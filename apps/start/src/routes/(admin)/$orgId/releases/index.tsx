import OrganizationReleasesPage from "@/components/pages/admin/orgid/releases";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/$orgId/releases/")({
	validateSearch: (search: Record<string, unknown>) => ({
		status: (search.status as string) || undefined,
		targetDateFrom: (search.targetDateFrom as string) || undefined,
		targetDateTo: (search.targetDateTo as string) || undefined,
		releasedFrom: (search.releasedFrom as string) || undefined,
		releasedTo: (search.releasedTo as string) || undefined,
	}),
	component: RouteComponent,
});

function RouteComponent() {
	return <OrganizationReleasesPage />;
}
