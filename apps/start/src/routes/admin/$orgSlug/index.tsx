import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$orgSlug/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgSlug } = Route.useParams();

	return <div>/admin/{orgSlug}</div>;
}
