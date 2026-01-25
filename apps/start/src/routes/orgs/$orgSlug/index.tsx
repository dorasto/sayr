import PublicOrgHomePage from "@/components/public";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orgs/$orgSlug/")({
	component: OrgDashboard,
});

function OrgDashboard() {
	return <PublicOrgHomePage />;
}
