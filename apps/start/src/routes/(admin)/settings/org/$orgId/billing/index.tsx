import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationBillingPage from "@/components/pages/admin/settings/orgId/billing";
import { PermissionError } from "@repo/util";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/billing/")({
  loader(ctx) {
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
