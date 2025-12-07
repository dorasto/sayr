import { createFileRoute } from "@tanstack/react-router";
import AdminHomePage from "@/components/admin";

export const Route = createFileRoute("/admin/")({
	component: AdminHomePage,
});
