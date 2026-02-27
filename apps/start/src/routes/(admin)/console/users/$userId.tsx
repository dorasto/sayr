import { SubWrapper } from "@/components/generic/wrapper";
import UserDetail from "@/components/console/user-detail";
import { getConsoleUserServer } from "@/lib/serverFunctions/getConsoleData";
import type { ConsoleUserDetail } from "@/lib/fetches/console";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/console/users/$userId")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		if (context.account.role !== "admin") {
			throw redirect({ to: "/" });
		}
		const result = await getConsoleUserServer({
			data: { userId: params.userId },
		});
		if (!result) {
			throw redirect({ to: "/console" });
		}
		return result;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	const data = Route.useLoaderData() as ConsoleUserDetail;
	return (
		<SubWrapper
			title={data.user.displayName || data.user.name}
			description={data.user.email}
			backButton="../.."
			backButtonClassName="bg-muted!"
		>
			<UserDetail data={data} />
		</SubWrapper>
	);
}
