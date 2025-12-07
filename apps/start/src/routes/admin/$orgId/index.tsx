import { createFileRoute } from "@tanstack/react-router";
import OrganizationHomePage from "@/components/admin/global/org";

export const Route = createFileRoute("/admin/$orgId/")({
	component: OrganizationHomePage,
});
