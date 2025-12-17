import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings/connections")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
