import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug")({
	component: OrgDashboard,
});

function OrgDashboard() {
	const { orgSlug } = Route.useParams();
	return (
		<div>
			<h3 className="text-2xl font-bold mb-4">Welcome to {orgSlug}</h3>
			<p>This is the organization dashboard.</p>
		</div>
	);
}
