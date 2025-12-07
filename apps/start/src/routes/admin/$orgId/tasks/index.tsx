import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$orgId/tasks/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId } = Route.useParams();
	return <div>/admin/{orgId}/tasks/</div>;
}
