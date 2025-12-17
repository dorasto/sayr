import { createFileRoute } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import UserConnections from "@/components/pages/admin/settings/connections";
import { getConnections } from "@/lib/serverFunctions/getConnections";
export const Route = createFileRoute("/admin/settings/connections/")({
	loader: async () => await getConnections(),
	component: RouteComponent,
});

function RouteComponent() {
	const { githubUser, dorasUser } = Route.useLoaderData();
	return (
		<SubWrapper title="Connections" style="compact">
			<UserConnections githubUser={githubUser} dorasUser={dorasUser} />
		</SubWrapper>
	);
}
