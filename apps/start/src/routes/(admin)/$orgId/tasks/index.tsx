import { createFileRoute } from "@tanstack/react-router";
import OrganizationTasksHomePage from "@/components/pages/admin/orgid/tasks";

export const Route = createFileRoute("/(admin)/$orgId/tasks/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <OrganizationTasksHomePage />;
}
