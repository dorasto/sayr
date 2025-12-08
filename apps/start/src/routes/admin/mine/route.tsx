import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderMyTasks } from "@/contexts/ContextMine";
import { getMyTasks } from "@/lib/serverFunctions/myTasks";

export const Route = createFileRoute("/admin/mine")({
	loader: async () => await getMyTasks(),
	component: MineLayout,
});

function MineLayout() {
	const { tasks, labels, views, categories } = Route.useLoaderData();
	return (
		<RootProviderMyTasks tasks={tasks} labels={labels} views={views} categories={categories}>
			<Outlet />
		</RootProviderMyTasks>
	);
}
