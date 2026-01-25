import UserTable from "@/components/console/user-table";
import { getUsers } from "@/lib/serverFunctions";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/console/")({
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
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Users ({total})</h1>
				<p className="text-muted-foreground">Manage and view all users</p>
			</div>
			<UserTable initialData={{ users, total }} />
		</div>
	);
}
