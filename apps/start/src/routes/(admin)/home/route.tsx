import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderMyTasks } from "@/contexts/ContextMine";
import { getMyTasks } from "../mine/route";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/home")({
	head: () => ({ meta: seo({ title: "Home" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		return await getMyTasks({ data: { account: context.account } });
	},
	component: HomeLayout,
});

function HomeLayout() {
	const { tasks, labels, views, categories, releases, permissionsByOrg } = Route.useLoaderData();
	return (
		<RootProviderMyTasks tasks={tasks} labels={labels} views={views} categories={categories} releases={releases} permissionsByOrg={permissionsByOrg}>
			<Outlet />
		</RootProviderMyTasks>
	);
}
