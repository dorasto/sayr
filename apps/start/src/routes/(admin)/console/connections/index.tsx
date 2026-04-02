import AdminConnectionsPage from "@/components/console/connections";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/console/connections/")({
	head: () => ({ meta: seo({ title: "Connections · Console" }) }),
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	return <AdminConnectionsPage />;
}
