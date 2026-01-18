import { createFileRoute } from "@tanstack/react-router";
import MyTasksPage from "@/components/pages/admin/mine";

export const Route = createFileRoute("/(admin)/mine/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <MyTasksPage />;
}
