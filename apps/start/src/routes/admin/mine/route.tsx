import { createFileRoute, Outlet } from "@tanstack/react-router";
import { myTasks } from "@/lib/serverFunctions/myTasks";
import { RootProviderMyTasks } from "./Context";

export const Route = createFileRoute("/admin/mine")({
	loader: () => myTasks(),
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
