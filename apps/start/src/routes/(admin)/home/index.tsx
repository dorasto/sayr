import { createFileRoute } from "@tanstack/react-router";
import AdminHomePage from "@/components/pages/admin/home";

export const Route = createFileRoute("/(admin)/home/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <AdminHomePage />;
}
