import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderMyTasks } from "@/contexts/ContextMine";
import { getMyTasks } from "@/lib/serverFunctions/myTasks";

export const Route = createFileRoute("/admin/mine")({
	// @ts-expect-error - TanStack Start's type system is too strict for JSONB fields (description, blockNote)
	loader: () => getMyTasks(),
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
