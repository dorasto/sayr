import AdminConnectionsPage from "@/components/console/conections";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUsers } from "@/lib/serverFunctions";

export const Route = createFileRoute("/(admin)/console/connections/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getUsers();
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	const { users, total } = Route.useLoaderData();
	return <AdminConnectionsPage accounts={{ users, total }} />;
}
