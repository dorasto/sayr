import { createFileRoute, redirect } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import UserConnections from "@/components/pages/admin/settings/connections";
import { getConnections } from "@/lib/serverFunctions/getConnections";
export const Route = createFileRoute("/admin/settings/connections/")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/home/login" });
		}
		return await getConnections({ data: { account: context.account } });
	},
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
