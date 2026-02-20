import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationBillingPage from "@/components/pages/admin/settings/orgId/billing";
import { Label } from "@repo/ui/components/label";
import { IconCreditCard } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/settings/org/$orgId/billing/")({
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
