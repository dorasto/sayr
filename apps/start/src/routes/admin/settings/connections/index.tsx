import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import UserConnections from "@/components/pages/admin/settings/connections";

// const routeApi = getRouteApi("/admin/settings/connections");

export const Route = createFileRoute("/admin/settings/connections/")({
	component: RouteComponent,
});

function RouteComponent() {
	// const { githubUser, dorasUser } = routeApi.useLoaderData();
	return (
		<SubWrapper title="Connections" style="compact">
			{/* <UserConnections githubUser={githubUser} dorasUser={dorasUser} /> */}
			test
		</SubWrapper>
	);
}
