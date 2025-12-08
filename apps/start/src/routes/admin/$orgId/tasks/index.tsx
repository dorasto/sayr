import { createFileRoute } from "@tanstack/react-router";
import OrganizationTasksHomePage from "@/components/tasks/render";

export const Route = createFileRoute("/admin/$orgId/tasks/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId } = Route.useParams();
	return <OrganizationTasksHomePage />;
}
