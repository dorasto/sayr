import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationBillingPage from "@/components/pages/admin/settings/orgId/billing";
import { PermissionError } from "@repo/util";
import { createFileRoute, redirect } from "@tanstack/react-router";

const edition = import.meta.env.VITE_SAYR_EDITION ?? "community";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/billing/")({
	loader(ctx) {
		// Billing is only available on the cloud edition
		if (edition !== "cloud") {
			throw redirect({
				to: "/settings/org/$orgId",
				params: { orgId: ctx.params.orgId },
			});
		}
		if (!ctx.context.permissions?.admin.billing) {
			throw new PermissionError();
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
  return (
    <SubWrapper
      title="Billing"
      description="Manage your plan, usage, and invoices."
      style="compact"
    >
      <SettingsOrganizationBillingPage />
    </SubWrapper>
  );
}
