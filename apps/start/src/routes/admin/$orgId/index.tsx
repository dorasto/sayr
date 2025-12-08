import { createFileRoute } from "@tanstack/react-router";
import OrganizationHomePage from "@/components/pages/admin/orgid";

export const Route = createFileRoute("/admin/$orgId/")({
	component: OrganizationHomePage,
});
