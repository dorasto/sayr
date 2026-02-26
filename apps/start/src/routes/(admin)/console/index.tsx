import UserTable from "@/components/console/user-table";
import { SubWrapper } from "@/components/generic/wrapper";
import { getConsoleUsersServer } from "@/lib/serverFunctions/getConsoleData";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/console/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		// Initial load: fetch page 1 server-side via direct DB access
		const result = await getConsoleUsersServer({ data: { page: 1, limit: 25 } });
		return {
			users: result.data ?? [],
			pagination: result.pagination ?? {
				limit: 25,
				page: 1,
				totalPages: 1,
				totalItems: 0,
				hasMore: false,
			},
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	const { users, pagination } = Route.useLoaderData();
	return (
		<SubWrapper title="Users" description={`${pagination.totalItems} users`}>
			<UserTable initialData={{ users, pagination }} />
		</SubWrapper>
	);
}
