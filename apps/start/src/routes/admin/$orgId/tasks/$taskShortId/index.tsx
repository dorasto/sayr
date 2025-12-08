import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId, taskShortId } = Route.useParams();

	return (
		<div>
			/admin/{orgId}/tasks/{taskShortId}/
		</div>
	);
}
