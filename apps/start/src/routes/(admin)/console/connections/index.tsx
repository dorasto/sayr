import AdminConnectionsPage from "@/components/console/conections";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/console/connections/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	return <AdminConnectionsPage />;
}
